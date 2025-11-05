// Routes for Direct Message (DM).
    // API routes:
        // GET /api/dms     -> get DMs for logged-in user
        // GET /api/dms/all -> get ALL DMs (admin only)
    // DynamoDB DM thread format (two styles):
        // Type A: PK = "DM", SK = "DM#<userA>#<userB>"
        // Type B: PK = "DM#<A>#<B>", SK = "META#INFO"
        // Both can store: { members?: string[], lastMessageAt?: string }

import express, { type Router, type Request, type Response } from "express";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { requireAuth, type JwtPayload } from "../middleware/requireAuth.js"; // middleware that checks if user is logged in
// Use the same DynamoDB client/table used for users/channels/messages
import { dbUser, CHANNEL_TABLE as USER_TABLE } from "../data/dynamoUser.js";

const router: Router = express.Router();

// Type definitions (data shapes)

// One DM record in database
type DMThread = {
  id: string;              // ex. "DM#alice#bob"
  members: string[];       // ex. ["naruto", "totoro"]
  lastMessageAt?: string;  // When the last message was sent
};

// Data format that we send to the frontend
type DMForClient = {
  dmId: string;        // ex. "DM#alice#bob"
  username: string;    // the "other" person in this DM, from the logged-in user's view
  lastMessageAt?: string;
};

// Helper functions

// Function to get a safe string value
//   Get a value from object by key -> If it's a string, return it -> If not, return "" (empty string)
function readStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

// Function to get a safe string array value
//   Get a value from object by key -> If it's an array, keep only string items -> If not → return [] (empty array)
function readStrArray(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

// Function to get username from current logged-in user
function getAuthUsername(req: Request): string {
  // user info is stored on req.user by requireAuth middleware
  const maybe = (req as unknown as { user?: JwtPayload }).user;
  const name = maybe?.username;
  return typeof name === "string" ? name : "";
}

// Function to find DM ID (ex. "DM#alice#bob") from PK, SK, or id field
function getDmIdFromKeys(
  obj: Record<string, unknown>,
  PKv: string,
  SKv: string
): string {
  if (PKv.startsWith("DM#")) return PKv;
  if (SKv.startsWith("DM#")) return SKv;
  const id = readStr(obj, "id");
  if (id.startsWith("DM#")) return id;
  return "";
}

// Function to get member names from "members" array. If missing, try to read from DM ID
function getMembers(obj: Record<string, unknown>, dmId: string): string[] {
  const arr = readStrArray(obj, "members");
  if (arr.length >= 2) return arr;

  // If no members, get names from DM ID (ex. "DM#userA#userB")
  if (dmId.startsWith("DM#")) {
    const parts = dmId
      .split("#")
      .slice(1)
      .filter(Boolean);
    return parts;
  }

  // If no members[] & no DM#userA#userB -> get names from userA & userB fields
  const a = readStr(obj, "userA"); // read userA as string (or "")
  const b = readStr(obj, "userB"); // read userB as string (or "")
  const out: string[] = [];        // make empty array
  if (a) out.push(a);              // add userA if found
  if (b) out.push(b);              // add userB if found
  return out;                      // return the list
}

// Function to scan all DM data from DynamoDB
async function scanAllDmMetas(): Promise<DMThread[]> {
  // ScanCommand = read all items in the table
  const scan = new ScanCommand({
    TableName: USER_TABLE,
    ProjectionExpression:
      "#PK, #SK, #id, members, userA, userB, lastMessageAt, #pk, #sk",
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
      "#pk": "pk",
      "#sk": "sk",
      "#id": "id",
    },
  });

  // Run the scan & get all rows from DynamoDB
  const result = await dbUser.send(scan);
  const rows = (result.Items ?? []) as Array<Record<string, unknown>>;

  // Helper: get string from first matching key (PK or pk, SK or sk)
  const getStrFromKeys = (obj: Record<string, unknown>, ...keys: string[]) =>
    String(keys.map((k) => obj[k]).find((v) => typeof v === "string") ?? "");

  // Keep only valid DM rows (old patterns, might be empty for your data)
  const dmRows = rows.filter((obj) => {
    const PKv = getStrFromKeys(obj, "PK", "pk");
    const SKv = getStrFromKeys(obj, "SK", "sk");
    const patternA = PKv === "DM" && SKv.startsWith("DM#");
    const patternB = PKv.startsWith("DM#") && SKv === "META#INFO";
    return patternA || patternB;
  });

  // Convert DynamoDB data into DM objects
  const items: DMThread[] = dmRows.map((obj) => {
    const PKv = getStrFromKeys(obj, "PK", "pk");
    const SKv = getStrFromKeys(obj, "SK", "sk");
    const id = getDmIdFromKeys(obj, PKv, SKv);
    const members = getMembers(obj, id);
    const lastMessageAt = readStr(obj, "lastMessageAt") || undefined;

    return { id, members, lastMessageAt };
  });

  // Sort DMs: newest message first
  items.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) {
      // Sort newest first (later time first)
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    }
    return a.id.localeCompare(b.id);
  });

  return items;
}

// Function to convert DB data -> frontend format
function mapToClient(all: DMThread[], me: string): DMForClient[] {
  return all.map((t) => {
    // Find the name of the other person in the chat
    const otherUser =
      t.members.find((m) => m !== me) ?? (t.members[0] || me);

    return {
      dmId: t.id,
      username: otherUser,           // field name "username" to match frontend api.ts
      lastMessageAt: t.lastMessageAt,
    };
  });
}

// fallback DM list if Dynamo does not have any DM meta rows
//      This matches the frontend fallback list.
function fallbackStaticDms(me: string): DMForClient[] {
  const allNames = [
    "Jack-skellington",
    "totoro",
    "guz",
    "naruto",
    "admin",
  ];

  // Remove myself from the list if we know who "me" is
  const names = me ? allNames.filter((name) => name !== me) : allNames;

  return names.map((name) => ({
    dmId: `DM#me#${name}`, // same pattern as frontend
    username: name,
  }));
}

// Routes

// GET /api/dms -> get DMs for the logged-in user
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const me = getAuthUsername(req); // get current user's name
    if (!me) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized" });
    }

    // Try to read from DynamoDB (might return empty if patterns don't match your data)
    const all = await scanAllDmMetas(); // get all DM data
    const mine = all.filter((t) => t.members.includes(me)); // keep only my DMs

    // Convert data to frontend format (add "username")
    let dmsForClient = mapToClient(mine, me);

    // if DB has no DM meta rows -> use static fallback list
    if (dmsForClient.length === 0) {
      dmsForClient = fallbackStaticDms(me);
    }

    // Send success response with DM list
    return res.json({ success: true, dms: dmsForClient });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[dms] list mine error:", msg);
    // Send error response if something fails
    return res
      .status(500)
      .json({ success: false, message: "list failed" });
  }
});

// GET /api/dms/all -> get all DMs (for admin use & still need login / require auth)
router.get("/all", requireAuth, async (_req: Request, res: Response) => {
  try {
    const all = await scanAllDmMetas(); // read all DM data
    // Send full DM list (raw format)
    return res.json({ success: true, dms: all });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[dms] list all error:", msg);
    // Send error if something goes wrong
    return res
      .status(500)
      .json({ success: false, message: "list failed" });
  }
});

export default router;
