// Start the Express server for Chappy backend.
// Sets up middlewares, CORS, logger, routes and health check.
// Now also serves the built frontend (for fullstack deploy).

import "dotenv/config";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import http from "http"; // use Node HTTP module to force HTTP/1.1 (insomnia problem)
import path from "path"; // for serving frontend build files

import registerRouter from "./routes/register.js"; // register route (for new user signup)
import channelsRouter from "./routes/channels.js"; // channels routes (public + locked lists)
import { requireAuth } from "./middleware/requireAuth.js"; // JWT middleware (to protect routes)
import loginRouter from "./routes/login.js"; // login route
import logoutRouter from "./routes/logout.js"; // logout route (frontend calls this and then clears token)
import { usersRouter } from "./routes/users.js"; // users routes (list users + delete user)
import dmsRouter from "./routes/dms.js"; // DM threads routes (require auth)
import messagesRouter from "./routes/messages.js"; // chat messages routes (GET + POST)
import type { JwtPayload } from "./middleware/requireAuth.js";
import { listAllUsers } from "./data/dynamoUser.js";

const app: Express = express();

// Read env variables
const PORT: number = Number(process.env.PORT) || 1338;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Allow Express to read JSON from the request body
app.use(express.json());

// Allow frontend to call this API (CORS)
app.use(
  cors({
    origin: CORS_ORIGIN, // only allow requests from this URL
    credentials: true, // allow cookies and auth headers
  })
);

// Fix Insomnia ("426 Upgrade Required" problem)
// Force the server to stay on HTTP/1.1, no HTTP/2 upgrade
app.disable("x-powered-by");
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Connection", "close"); // avoid HTTP/2 upgrade
  next();
});

// Request logger (log each request method and path)
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check route (test if API is ok)
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "API OK" });
});

// Register (user signup)
app.use("/api/register", registerRouter);

// Channels
app.use("/api/channels", channelsRouter);

// Login
app.use("/api/login", loginRouter);

// Logout (frontend clears token after this)
app.use("/api/logout", logoutRouter);

// Users
app.use("/api/users", usersRouter);

// DMs
app.use("/api/dms", dmsRouter);

// Messages
app.use("/api/messages", messagesRouter);

// Protected route -> user info from token (+ userId from DynamoDB)
app.get("/api/me", requireAuth, async (req: Request, res: Response) => {
  const authUser = res.locals.user as JwtPayload | undefined;

  if (!authUser) {
    return res.status(401).json({
      success: false,
      message: "not logged in",
    });
  }

  let userId: string | null = authUser.userId ?? null;

  // If token has no userId, try to find it in DynamoDB by username
  if (!userId && authUser.username) {
    try {
      const allUsers = await listAllUsers();
      const meRow = allUsers.find(
        (u) =>
          u.username.toLowerCase() === authUser.username!.toLowerCase()
      );

      if (meRow) {
        userId = meRow.userId;
      }

      console.log(
        `[/api/me] lookup ${authUser.username} => userId = ${
          userId ?? "NOT FOUND"
        }`
      );
    } catch (err) {
      console.error("[/api/me] lookup error", err);
    }
  }

  res.json({
    success: true,
    username: authUser.username ?? null,
    accessLevel: authUser.accessLevel ?? "user",
    userId,
  });
});

// Serve frontend build (React SPA) 
// This should be after all /api routes, so /api/* still works.

const __dirnamePath = path.resolve();
// Vite build will be copied into srcServer/dist (for Render runtime)
const frontendDistPath = path.join(__dirnamePath, "dist");

// Serve static files from the dist folder
app.use(express.static(frontendDistPath));

// For any non-API route, send back index.html (SPA fallback)
// Use regex so it does NOT catch /api/* routes.
app.get(/^\/(?!api).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// Start HTTP/1.1 server
const server = http.createServer(app);

// listen on PORT only (host 0.0.0.0) so Render can detect the open port
server.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
