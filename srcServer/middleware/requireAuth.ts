// Verify/check JWT from "Authorization: Bearer <token>"
// - If the token is valid -> save user info and go to the next step
// - If missing/invalid -> return 401

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Describe what expect inside the token
export type JwtPayload = {
  userId: string;
  username?: string;
  accessLevel?: string;
  iat?: number;
  exp?: number;
};

// Middleware to check if the user is logged in
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get "Authorization" header: should be "Bearer <token>"
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");

    // If there’s no token or it’s not Bearer type -> reject
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ success: false, message: "missing or invalid token" });
    }

    // Verify token (Check if the token is real & not expired)
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Save the user info from the token (for later use)
    res.locals.user = decoded;

    // Attach user info to req.user
    (req as unknown as { user?: JwtPayload }).user = decoded;

    next(); // Continue to the next route
  } catch {
    // Token is missing, wrong, or expired
    return res
      .status(401)
      .json({ success: false, message: "missing or invalid token" });
  }
}
