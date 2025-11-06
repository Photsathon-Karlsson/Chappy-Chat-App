// Router for listing and deleting users
// Handles:
//   GET    /api/users          -> list all users (need auth)
//   DELETE /api/users/:userId  -> delete self (or any user if admin)

import express, { Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import type { JwtPayload } from "../middleware/requireAuth.js";
import { listAllUsers, deleteUserById } from "../data/dynamoUser.js";

export const usersRouter = express.Router();

// GET /api/users - list all users (require auth)
usersRouter.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const users = await listAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error("[users] list error", error);
    res.status(500).json({
      success: false,
      message: "could not load users",
    });
  }
});

// DELETE /api/users/:userId - delete self or any user if admin
usersRouter.delete(
  "/:userId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Try to read user info from middleware
      const authUser =
        (res.locals.user as JwtPayload | undefined) ||
        ((req as Request & { user?: JwtPayload }).user);

      if (!authUser) {
        return res.status(401).json({
          success: false,
          message: "not logged in",
        });
      }

      const { userId } = req.params;

      // Load all users 
      const users = await listAllUsers();
      const selfRow = users.find((u) => u.username === authUser.username);

      if (!selfRow) {
        return res.status(404).json({
          success: false,
          message: "current user not found",
        });
      }

      // Check permissions
      const isSelf = selfRow.userId === userId;
      const isAdmin = authUser.accessLevel === "admin";

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "you can only delete yourself unless you are admin",
        });
      }

      // Do delete
      await deleteUserById(userId);

      return res.json({ success: true });
    } catch (error) {
      console.error("[users] delete error", error);
      res.status(500).json({
        success: false,
        message: "could not delete user",
      });
    }
  }
);
