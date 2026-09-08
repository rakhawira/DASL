module.exports = {
  port: process.env.PORT,
  addr: process.env.HOST,
  timeout: parseInt(process.env.API_TIMEOUT),
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
  bodyLimit: process.env.BODY_LIMIT,
};
