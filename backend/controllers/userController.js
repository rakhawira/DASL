const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const {
  validateRequiredFields,
  sanitizeString,
} = require("../utils/validation");
const { invalidateCache } = require("../middleware/cache");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { CreateUserSchema, UpdateUserSchema, NumericIdSchema } = require("../schemas/validationSchemas");

const getUsers = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.name, u.role, u.jurusan, u.fakultas, 
             COALESCE(dt.dosen_type, NULL) as "dosenType", u.status, 
             u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      LEFT JOIN dosen_types dt ON u.id = dt.user_id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);

    successResponse(res, result.rows, "Users fetched successfully");
  } catch (error) {
    logError(error, "Error fetching users");
    errorResponse(res, error, "Failed to fetch users");
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT u.id, u.username, u.name, u.role, u.jurusan, u.fakultas, 
             COALESCE(dt.dosen_type, NULL) as "dosenType", u.status, 
             u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      LEFT JOIN dosen_types dt ON u.id = dt.user_id 
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      notFoundResponse(res, "User not found");
      return;
    }

    successResponse(res, result.rows[0], "User retrieved successfully");
  } catch (error) {
    logError(error, "Error fetching user by ID");
    errorResponse(res, error, "Failed to fetch user");
  }
};

const createUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    log("Processing user creation");
    
    // Validate request body using zod
    const validationResult = CreateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `User creation failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      validationErrorResponse(res, validationResult.error.errors, "Invalid request data");
      await client.query("ROLLBACK");
      return;
    }

    const { name, username, password, role, jurusan, fakultas, dosenType } =
      validationResult.data;

    log(
      `Creating user - Username: ${username}, Name: ${name}, Role: ${role}`,
    );

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user
    const userQuery = `
      INSERT INTO users (name, username, password, role, jurusan, fakultas) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, username, name, role, jurusan, fakultas, status,
               created_at as "createdAt", updated_at as "updatedAt"
    `;

    const userParams = [
      sanitizeString(name),
      sanitizeString(username),
      hashedPassword,
      role,
      jurusan || null,
      fakultas || null,
    ];

    const userResult = await client.query(userQuery, userParams);
    const createdUser = userResult.rows[0];

    // Insert dosen_type if role is dosen and dosenType is provided
    if (role === "dosen" && dosenType) {
      const dosenTypeQuery = `
        INSERT INTO dosen_types (user_id, dosen_type) 
        VALUES ($1, $2) 
        RETURNING dosen_type
      `;

      await client.query(dosenTypeQuery, [createdUser.id, dosenType]);
      createdUser.dosenType = dosenType;
    }

    await client.query("COMMIT");

    log(
      `User created successfully - ID: ${createdUser.id}, Username: ${username}`,
    );

    // Invalidate cache
    await invalidateCache("cache:/api/users*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    successResponse(res, createdUser, "User created successfully", 201);
  } catch (error) {
    await client.query("ROLLBACK");
    logError(error, "Error creating user");
    errorResponse(res, error, "Failed to create user");
  } finally {
    client.release();
  }
};

const updateUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    
    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(id);
    if (!idValidation.success) {
      log(
        `User update failed - Invalid ID format: ${id}`,
      );
      validationErrorResponse(res, idValidation.error.errors, "Invalid user ID");
      await client.query("ROLLBACK");
      return;
    }

    // Validate request body using zod
    const validationResult = UpdateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `User update failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      validationErrorResponse(res, validationResult.error.errors, "Invalid request data");
      await client.query("ROLLBACK");
      return;
    }

    const { name, username, password, role, jurusan, fakultas, dosenType } =
      validationResult.data;

    // Update user
    let userQuery = "UPDATE users SET name = $1, username = $2";
    let userParams = [sanitizeString(name), sanitizeString(username)];
    let paramIndex = 3;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      userQuery += `, password = $${paramIndex}`;
      userParams.push(hashedPassword);
      paramIndex++;
    }

    if (role) {
      userQuery += `, role = $${paramIndex}`;
      userParams.push(role);
      paramIndex++;
    }

    if (jurusan) {
      userQuery += `, jurusan = $${paramIndex}`;
      userParams.push(jurusan);
      paramIndex++;
    }

    if (fakultas) {
      userQuery += `, fakultas = $${paramIndex}`;
      userParams.push(fakultas);
      paramIndex++;
    }

    userQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, username, name, role, jurusan, fakultas, status, created_at as "createdAt", updated_at as "updatedAt"`;
    userParams.push(id);

    const userResult = await client.query(userQuery, userParams);

    if (userResult.rows.length === 0) {
      notFoundResponse(res, "User not found");
      await client.query("ROLLBACK");
      return;
    }

    const updatedUser = userResult.rows[0];

    // Handle dosen_type update
    if (role === "dosen" && dosenType) {
      // Update or insert dosen_type
      const upsertQuery = `
        INSERT INTO dosen_types (user_id, dosen_type) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          dosen_type = $2,
          updated_at = CURRENT_TIMESTAMP
        RETURNING dosen_type
      `;

      await client.query(upsertQuery, [id, dosenType]);
      updatedUser.dosenType = dosenType;
    } else if (role !== "dosen") {
      // Remove dosen_type if role is not dosen
      await client.query("DELETE FROM dosen_types WHERE user_id = $1", [id]);
    }

    await client.query("COMMIT");

    // Invalidate cache
    await invalidateCache("cache:/api/users*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    successResponse(res, updatedUser, "User updated successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    logError(error, "Error updating user");
    errorResponse(res, error, "Failed to update user");
  } finally {
    client.release();
  }
};

const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // Delete from dosen_types first (due to foreign key constraint)
    await client.query("DELETE FROM dosen_types WHERE user_id = $1", [id]);

    // Delete from users (CASCADE will handle this automatically, but being explicit)
    const query = "DELETE FROM users WHERE id = $1 RETURNING *";
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      notFoundResponse(res, "User not found");
      await client.query("ROLLBACK");
      return;
    }

    await client.query("COMMIT");

    // Invalidate cache
    await invalidateCache("cache:/api/users*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    successResponse(res, result.rows[0], "User deleted successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    logError(error, "Error deleting user");
    errorResponse(res, error, "Failed to delete user");
  } finally {
    client.release();
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
};
