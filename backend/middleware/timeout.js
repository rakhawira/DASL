const timeoutMiddleware = (req, res, next) => {
  const timeout = parseInt(process.env.API_TIMEOUT) || 0;
  if (timeout > 0) {
    req.setTimeout(timeout);
  }
  next();
};

module.exports = timeoutMiddleware;
