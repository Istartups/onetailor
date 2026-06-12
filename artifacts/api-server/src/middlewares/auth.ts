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

// ─── Follow-Up Agent Auth ────────────────────────────────────────────────────

export interface CRMRequest extends Request {
  crmUserId?: number;
  crmUserRole?: "admin" | "agent";
  crmUserName?: string;
}

/**
 * Accepts either an admin token or a follow-up agent token.
 * Sets req.crmUserRole = "admin" | "agent" and req.crmUserId accordingly.
 */
export const authenticateCRM = (req: CRMRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  // Try admin token first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId?: number; agentId?: number; role?: string };
    if (decoded.adminId) {
      req.crmUserId = decoded.adminId;
      req.crmUserRole = "admin";
      next();
      return;
    }
    if (decoded.agentId) {
      req.crmUserId = decoded.agentId;
      req.crmUserRole = "agent";
      req.crmUserName = (decoded as any).name;
      next();
      return;
    }
  } catch {
    // Not a valid admin/agent token — fall through to reject
  }

  res.status(403).json({ message: "Forbidden: Invalid or expired token" });
};

/** Require admin role specifically (within CRM context) */
export const requireAdminRole = (req: CRMRequest, res: Response, next: NextFunction) => {
  if (req.crmUserRole !== "admin") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return;
  }
  next();
};
