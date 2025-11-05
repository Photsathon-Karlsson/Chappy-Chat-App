// Router for listing & deleting users
// handle GET (list all users) and DELETE (delete self/admin only)

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
      const authUser = (req as Request & { user?: JwtPayload }).user;

      if (!authUser) {
        return res.status(401).json({
          success: false,
          message: "not logged in",
        });
      }

      const { userId } = req.params;

      const isSelf = authUser.userId === userId;
      const isAdmin = authUser.accessLevel === "admin";

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "you can only delete yourself unless you are admin",
        });
      }

      await deleteUserById(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("[users] delete error", error);
      res.status(500).json({
        success: false,
        message: "could not delete user",
      });
    }
  }
);
