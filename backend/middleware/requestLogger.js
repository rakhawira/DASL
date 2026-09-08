const { logRequest } = require("../utils/logger");

const requestLogger = (req, res, next) => {
  logRequest(req);
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [RESPONSE] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`,
    );
  });

  next();
};

module.exports = requestLogger;
