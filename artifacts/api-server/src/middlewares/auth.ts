import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ─── Admin Auth ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env["JWT_SECRET"] || "onetailor-admin-secret-key-123";

export interface AuthRequest extends Request {
  adminId?: number;
}

export const authenticateAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = decoded.adminId;
    next();
  } catch {
    res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};

// ─── User Auth ───────────────────────────────────────────────────────────────

export const USER_JWT_SECRET = process.env["USER_JWT_SECRET"] || "onetailor-user-secret-key-456";

export interface AuthUserRequest extends Request {
  userId?: number;
  userEmail?: string;
}

/** Require a valid user JWT — blocks the request if absent or invalid. */
export const authenticateUser = (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET) as { userId: number; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(403).json({ message: "Forbidden: Invalid or expired session. Please log in again." });
  }
};

/** Optional user auth — attaches userId if valid token present; never blocks. */
export const optionalUserAuth = (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, USER_JWT_SECRET) as { userId: number; email: string };
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch {
      // Invalid token — proceed as unauthenticated (don't block)
    }
  }
  next();
};
