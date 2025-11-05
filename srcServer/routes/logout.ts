// Logout route for Chappy
    // POST /api/logout -> always returns success

import express, { type Router, type Request, type Response } from "express";

const router: Router = express.Router();

// POST /api/logout
router.post("/", (_req: Request, res: Response) => {
    // Send a success message.
    // No need to check authentication here, because the frontend will handle token removal.
  return res.json({ success: true, message: "logged out" });
});

export default router;
