const successResponse = (
  res,
  data,
  message = "Operation successful",
  statusCode = 200,
) => {
  if (res.headersSent) return;
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const errorResponse = (
  res,
  error,
  message = "Operation failed",
  statusCode = 500,
) => {
  if (res.headersSent) return;
  return res.status(statusCode).json({
    success: false,
    error: message,
    details: error.message,
  });
};

const paginatedResponse = (
  res,
  data,
  pagination,
  message = "Data retrieved successfully",
) => {
  if (res.headersSent) return;
  return res.status(200).json({
    success: true,
    data,
    pagination,
    message,
  });
};

const validationErrorResponse = (
  res,
  errors,
  message = "Validation failed",
) => {
  if (res.headersSent) return;
  return res.status(400).json({
    success: false,
    error: message,
    errors,
  });
};

const notFoundResponse = (res, message = "Resource not found") => {
  if (res.headersSent) return;
  return res.status(404).json({
    success: false,
    error: message,
  });
};

const unauthorizedResponse = (res, message = "Unauthorized") => {
  if (res.headersSent) return;
  return res.status(401).json({
    success: false,
    error: message,
  });
};

const forbiddenResponse = (res, message = "Forbidden") => {
  if (res.headersSent) return;
  return res.status(403).json({
    success: false,
    error: message,
  });
};

const conflictResponse = (res, message = "Resource conflict") => {
  if (res.headersSent) return;
  return res.status(409).json({
    success: false,
    error: message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
};
