// Start the Express server for Chappy backend.
// Sets up middlewares, CORS, logger, & health route.

import "dotenv/config";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import http from "http"; // use Node's HTTP module to force HTTP/1.1 (as have problem with insomnia)
import registerRouter from "./routes/register.js"; // register route (for new user signup)
import channelsRouter from "./routes/channels.js"; // channels routes (public + locked lists)
import { requireAuth } from "./middleware/requireAuth.js"; // JWT middleware (to protect routes)
// login route
import loginRouter from "./routes/login.js";
// logout route (frontend calls this and then clears token)
import logoutRouter from "./routes/logout.js";
// users routes (list users + delete user)
import { usersRouter } from "./routes/users.js";
// dms route
import dmsRouter from "./routes/dms.js"; // DM threads routes (require auth)
// messages route
import messagesRouter from "./routes/messages.js"; // chat messages routes (GET + POST)

const app: Express = express();

// Read env variables
const PORT: number = Number(process.env.PORT) || 1337;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Allow Express to read JSON from the request body
app.use(express.json());

// Allow frontend to call this API (CORS)
app.use(
  cors({
    origin: CORS_ORIGIN, // only allow requests from this URL
    credentials: true, // allow cookies / auth headers
  })
);

// * Fix Insomnia ("426 Upgrade Required" problem)
// Force the server to stay on HTTP/1.1, no HTTP/2 upgrade
app.disable("x-powered-by");
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Connection", "close"); // avoid HTTP/2 upgrade
  next();
});

// Request logger (log each request (method + path))
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check route (test if API is ok)
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "API OK" });
});

// Root message
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Chappy API",
    status: "ok",
    docs: "Use /api/health to test the server",
  });
});

// Register (user signup)
app.use("/api/register", registerRouter);

// Channels 
//     - GET /api/channels      -> public channels list
//     - GET /api/channels/all  -> all channels 
app.use("/api/channels", channelsRouter);

// Login 
app.use("/api/login", loginRouter);

// Logout (frontend clears token after this)
//     - POST /api/logout -> { success: true, message: "logged out" }
app.use("/api/logout", logoutRouter);

// Users 
//     - GET /api/users            -> list all users (require auth)
//     - DELETE /api/users/:userId -> delete user (self or admin)
app.use("/api/users", usersRouter);

// DMs 
//     - GET /api/dms       -> user’s DMs (require auth)
//     - GET /api/dms/all   -> all DMs (admin or auth)
app.use("/api/dms", dmsRouter);

// Messages routes 
//     - GET /api/messages  -> list messages for channel or DM
//     - POST /api/messages -> send new message (require auth)
app.use("/api/messages", messagesRouter);

// Protected route -> user info from token
app.get("/api/me", requireAuth, (req: Request, res: Response) => {
  // Middleware (requireAuth) puts user info in res.locals.user
  const u = res.locals.user as {
    userId: string;
    username?: string;
    accessLevel?: string;
  };

  // Return user info from the token
  res.json({
    success: true,
    userId: u.userId,
    username: u.username ?? null,
    accessLevel: u.accessLevel ?? "user",
  });
});

// Start HTTP/1.1 server (fixes 426 error in Insomnia)
const server = http.createServer(app);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
