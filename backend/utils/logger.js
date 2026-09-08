const log = (message, type = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const logRequest = (req, message = "") => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get("User-Agent") || "Unknown";
  console.log(
    `[${timestamp}] [REQUEST] ${method} ${url} - User-Agent: ${userAgent} ${message}`,
  );
};

const logDatabase = (operation, query, params = []) => {
  const timestamp = new Date().toISOString();
  const sanitizedQuery = query.replace(/\s+/g, " ").trim();
  const paramsStr =
    params.length > 0 ? ` | Params: ${JSON.stringify(params)}` : "";
  console.log(
    `[${timestamp}] [DATABASE] ${operation}: ${sanitizedQuery}${paramsStr}`,
  );
};

const logError = (error, context = "") => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${context}: ${error.message}`);
  if (error.stack) {
    console.error(`[${timestamp}] [ERROR] Stack: ${error.stack}`);
  }
};

module.exports = {
  log,
  logRequest,
  logDatabase,
  logError,
};
