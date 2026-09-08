const pool = require("../config/database");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
} = require("../utils/response");
const { log, logError, logDatabase } = require("../utils/logger");
const { invalidateCache } = require("../middleware/cache");

// Get all SSKM configurations
const getSSKMConfigs = async (req, res) => {
  try {
    log("Fetching SSKM configurations");

    const query = `
      SELECT config_key, config_value, description, created_at, updated_at
      FROM sskm_config
      ORDER BY config_key
    `;

    logDatabase("SELECT", query);
    const result = await pool.query(query);

    const configs = {};
    result.rows.forEach((row) => {
      configs[row.config_key] = {
        value: row.config_value,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    log(`Retrieved ${result.rows.length} SSKM configurations`);
    return successResponse(
      res,
      configs,
      "SSKM configurations retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching SSKM configurations");
    return errorResponse(res, error, "Failed to fetch SSKM configurations");
  }
};

// Get specific SSKM configuration
const getSSKMConfig = async (req, res) => {
  try {
    const { configKey } = req.params;
    log(`Fetching SSKM configuration: ${configKey}`);

    const query = `
      SELECT config_key, config_value, description, created_at, updated_at
      FROM sskm_config
      WHERE config_key = $1
    `;

    logDatabase("SELECT", query, [configKey]);
    const result = await pool.query(query, [configKey]);

    if (result.rows.length === 0) {
      log(`SSKM configuration not found: ${configKey}`);
      return notFoundResponse(res, "SSKM configuration not found");
    }

    const config = result.rows[0];
    log(`Retrieved SSKM configuration: ${configKey}`);
    return successResponse(
      res,
      config,
      "SSKM configuration retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching SSKM configuration");
    return errorResponse(res, error, "Failed to fetch SSKM configuration");
  }
};

// Update SSKM configuration
const updateSSKMConfig = async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;

    log(`Updating SSKM configuration: ${configKey}`);

    if (!configValue) {
      log("SSKM configuration update failed - Missing config value");
      return errorResponse(res, null, "Config value is required");
    }

    // Check if configuration exists
    const checkQuery = `SELECT id FROM sskm_config WHERE config_key = $1`;
    const checkResult = await pool.query(checkQuery, [configKey]);

    if (checkResult.rows.length === 0) {
      // Create new configuration if it doesn't exist
      const insertQuery = `
        INSERT INTO sskm_config (config_key, config_value, description)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const params = [configKey, configValue, `Configuration for ${configKey}`];

      logDatabase("INSERT", insertQuery, params);
      const result = await pool.query(insertQuery, params);

      // Invalidate cache
      await invalidateCache("cache:/api/sskm-config/*");

      log(`SSKM configuration created: ${configKey} = ${configValue}`);
      return successResponse(
        res,
        result.rows[0],
        "SSKM configuration created successfully",
      );
    } else {
      // Update existing configuration
      const updateQuery = `
        UPDATE sskm_config 
        SET config_value = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE config_key = $1
        RETURNING *
      `;

      const params = [configKey, configValue];
      logDatabase("UPDATE", updateQuery, params);
      const result = await pool.query(updateQuery, params);

      // Invalidate cache
      await invalidateCache("cache:/api/sskm-config/*");

      log(`SSKM configuration updated: ${configKey} = ${configValue}`);
      return successResponse(
        res,
        result.rows[0],
        "SSKM configuration updated successfully",
      );
    }
  } catch (error) {
    logError(error, "Error updating SSKM configuration");
    return errorResponse(res, error, "Failed to update SSKM configuration");
  }
};

// Get max required points (using max_activity_points table)
const getMaxRequiredPoints = async (req, res) => {
  try {
    log("Fetching max required points from max_activity_points table");

    const query = `
      SELECT max_points
      FROM max_activity_points
      ORDER BY id
      LIMIT 1
    `;

    logDatabase("SELECT", query);
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      // Return default value if not found
      log("Max required points not found, returning default: 100");
      return successResponse(
        res,
        { maxRequiredPoints: 100 },
        "Max required points retrieved successfully",
      );
    }

    const maxRequiredPoints = parseInt(result.rows[0].max_points) || 100;
    log(`Retrieved max required points: ${maxRequiredPoints}`);
    return successResponse(
      res,
      { maxRequiredPoints },
      "Max required points retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching max required points");
    return errorResponse(res, error, "Failed to fetch max required points");
  }
};

// Update max required points (using max_activity_points table)
const updateMaxRequiredPoints = async (req, res) => {
  try {
    const { maxRequiredPoints } = req.body;
    log(`Updating max required points to: ${maxRequiredPoints}`);

    if (
      !maxRequiredPoints ||
      isNaN(maxRequiredPoints) ||
      maxRequiredPoints <= 0
    ) {
      log("Max required points update failed - Invalid value");
      return errorResponse(res, null, "Valid max required points is required");
    }

    const points = parseInt(maxRequiredPoints);

    // Check if record exists
    const checkQuery = `SELECT id FROM max_activity_points ORDER BY id LIMIT 1`;
    const checkResult = await pool.query(checkQuery);

    if (checkResult.rows.length === 0) {
      // Create new record if doesn't exist
      const insertQuery = `
        INSERT INTO max_activity_points (max_points, description)
        VALUES ($1, 'Maximum required activity points per student')
        RETURNING *
      `;

      logDatabase("INSERT", insertQuery, [points]);
      const insertResult = await pool.query(insertQuery, [points]);

      // Invalidate cache
      await invalidateCache("cache:/api/sskm-config/*");

      log(`Max required points created: ${points}`);
      return successResponse(
        res,
        { maxRequiredPoints: points },
        "Max required points created successfully",
      );
    } else {
      // Update existing record
      const updateQuery = `
        UPDATE max_activity_points 
        SET max_points = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      logDatabase("UPDATE", updateQuery, [points, checkResult.rows[0].id]);
      const result = await pool.query(updateQuery, [
        points,
        checkResult.rows[0].id,
      ]);

      // Invalidate cache
      await invalidateCache("cache:/api/sskm-config/*");

      log(`Max required points updated: ${points}`);
      return successResponse(
        res,
        { maxRequiredPoints: points },
        "Max required points updated successfully",
      );
    }
  } catch (error) {
    logError(error, "Error updating max required points");
    return errorResponse(res, error, "Failed to update max required points");
  }
};

module.exports = {
  getSSKMConfigs,
  getSSKMConfig,
  updateSSKMConfig,
  getMaxRequiredPoints,
  updateMaxRequiredPoints,
};
