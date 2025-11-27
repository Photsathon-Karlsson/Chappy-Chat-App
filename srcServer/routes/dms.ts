// Routes for Direct Message (DM)
// API routes:
//   GET /api/dms     -> list all users as DM targets (except current user)
//   GET /api/dms/all -> list all users as DM targets (admin or tool usage)

import express, { type Router, type Request, type Response } from "express";
import { requireAuth, type JwtPayload } from "../middleware/requireAuth.js";
import {
  listAllUsers,
  type UserItem,
} from "../data/dynamoUser.js";

const router: Router = express.Router();

// Data format sent to frontend
// dmId is a stable id for a DM thread between two users
// username is the "other" person in the DM
type DMForClient = {
  dmId: string;
  username: string;
  lastMessageAt?: string;
  id?: string;   // same as dmId, helps mapping in frontend
  name?: string; // same as username, helps mapping in frontend
};

// Function: read username from JWT payload
function getAuthUsername(req: Request): string {
  const maybe = (req as Request & { user?: JwtPayload }).user;
  const name = maybe?.username;
  return typeof name === "string" ? name : "";
}

// Function: build stable DM id from two usernames
// alphabetical (a-z) & lowercased
// Ex. buildDmId("Naruto", "Guz") -> "DM#guz#naruto"
function buildDmId(a: string, b: string): string {
  const p1 = a.toLowerCase();
  const p2 = b.toLowerCase();
  const sorted = [p1, p2].sort();
  return `DM#${sorted[0]}#${sorted[1]}`;
}

// Function: convert user list to DM list for one current user
function mapUsersToDms(
  users: UserItem[],
  me: string
): DMForClient[] {
  const meLower = me.toLowerCase();

  const dms: DMForClient[] = [];

  for (const u of users) {
    const name = u.username?.trim();
    if (!name) continue;

    const lower = name.toLowerCase();

    // Skip current user to avoid DM with self
    if (lower === meLower) continue;

    const dmId = buildDmId(me, name);

    dms.push({
      dmId,
      username: name,
      id: dmId,
      name,
    });
  }

  // Sort list by username for nice display
  dms.sort((a, b) => a.username.localeCompare(b.username));

  return dms;
}

// GET /api/dms -> list DM targets for current logged-in user
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const me = getAuthUsername(req);

    if (!me) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized" });
    }

    // Load all users from DynamoDB
    const users = await listAllUsers();

    // Convert users to DM entries
    const dmsForClient = mapUsersToDms(users, me);

    return res.json({ success: true, dms: dmsForClient });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[dms] list mine error:", msg);
    return res
      .status(500)
      .json({ success: false, message: "list failed" });
  }
});

// GET /api/dms/all -> list DM for admin  
// builds list without filtering out current user.
router.get("/all", requireAuth, async (_req: Request, res: Response) => {
  try {
    const users = await listAllUsers();

    const dms: DMForClient[] = users
      .filter((u) => u.username)
      .map((u) => {
        const uname = u.username as string;
        const dmId = `DM#all#${uname.toLowerCase()}`;
        return {
          dmId,
          username: uname,
          id: dmId,
          name: uname,
        };
      });

    dms.sort((a, b) => a.username.localeCompare(b.username));

    return res.json({ success: true, dms });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[dms] list all error:", msg);
    return res
      .status(500)
      .json({ success: false, message: "list failed" });
  }
});

export default router;
