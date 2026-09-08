const pool = require("../config/database");
const { logDatabase, logError } = require("../utils/logger");

const getUsers = async () => {
  try {
    const query = "SELECT * FROM users";
    const result = await pool.query(query);

    return result.rows;
  } catch (error) {
    logError(error, "Error fetching users");
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const query = "SELECT * FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error fetching user by ID");
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    const { name, username, password, role, jurusan, fakultas } = userData;

    const query = `
      INSERT INTO users (name, username, password, role, jurusan, fakultas) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;

    const params = [
      name.trim(),
      username.trim(),
      password,
      role || "mahasiswa",
      jurusan || null,
      fakultas || null,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);

    return result.rows[0];
  } catch (error) {
    logError(error, "Error creating user");
    throw error;
  }
};

const updateUser = async (id, updateData) => {
  try {
    const { name, username, password, role, jurusan, fakultas } = updateData;

    let query = "UPDATE users SET name = $1, username = $2";
    let params = [name.trim(), username.trim()];
    let paramIndex = 3;

    if (password) {
      query += `, password = $${paramIndex}`;
      params.push(password);
      paramIndex++;
    }

    if (role) {
      query += `, role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (jurusan) {
      query += `, jurusan = $${paramIndex}`;
      params.push(jurusan);
      paramIndex++;
    }

    if (fakultas) {
      query += `, fakultas = $${paramIndex}`;
      params.push(fakultas);
      paramIndex++;
    }

    query += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error updating user");
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    const query = "DELETE FROM users WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error deleting user");
    throw error;
  }
};

const getUserByUsername = async (username) => {
  try {
    const query = "SELECT * FROM users WHERE username = $1";
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error fetching user by username");
    throw error;
  }
};

const checkUsernameExists = async (username, excludeId = null) => {
  try {
    let query = "SELECT id FROM users WHERE username = $1";
    let params = [username];

    if (excludeId) {
      query += " AND id != $2";
      params.push(excludeId);
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0;
  } catch (error) {
    logError(error, "Error checking username existence");
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByUsername,
  checkUsernameExists,
};
