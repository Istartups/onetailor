import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const SENSITIVE_FIELDS = new Set([
  "password", "password_hash", "passwordHash", "passwordConfirm",
  "currentPassword", "newPassword", "confirmPassword",
  "paystackSecretKey", "secretKey", "apiKey", "token",
  "smtpPass", "smtp_pass", "brevoKey", "resendKey",
]);

function maskBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const masked: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body as Record<string, unknown>)) {
    masked[key] = SENSITIVE_FIELDS.has(key) ? "[REDACTED]" : val;
  }
  return masked;
}

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: maskBody(req.body),
    },
  }, "Unhandled error occurred");

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};
