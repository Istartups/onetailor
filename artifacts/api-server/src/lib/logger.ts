import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// Use standard pino configuration without worker threads in development
// to avoid "worker has exited" errors with tsx --watch
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
});

