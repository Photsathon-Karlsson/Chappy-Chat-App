// Channel Routes (API endpoints)
    // - GET /api/channels      -> public list (only open/unlocked channels)
    // - GET /api/channels/all  -> private list (need token, show all channels)
// DynamoDB Table Data Structure 
    //   Type A: PK = "CHANNEL",        SK = "CHANNEL#<name>", fields: { name, isLocked }
    //   Type B: PK = "CHANNEL#<name>", SK = "META#INFO",      fields: { name, isLocked }

import express, { type Router, type Request, type Response } from "express";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

// dbUser = DynamoDB client connected to the user data table
// CHANNEL_TABLE = table name where channel data is stored
import { dbUser, CHANNEL_TABLE } from "../data/dynamoUser.js";

// requireAuth = middleware that checks if user has a valid JWT token (If token is invalid or missing -> block access)
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

// Data we send to the frontend
type ChannelMeta = { name: string; isLocked: boolean };

// Function to safely get a string value from an object. (If the value is not a string -> return empty string.)
function readStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

// Function to get a boolean value from an object. (If not a boolean -> return fallback value (default = false).)
function readBool(obj: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = obj[key];
  return typeof v === "boolean" ? v : fallback;
}

// Main function: read channels from DynamoDB
    // 1) Scans the table & finds items that match Type A or Type B
    // 2) Works with both "PK/SK" & lowercase "pk/sk" keys.
    // 3) If showLocked=false -> skip locked channels
    // 4) If same channel name appears twice -> keep one
async function scanChannelMetas(showLocked: boolean): Promise<ChannelMeta[]> {
  // 1) Scan the DynamoDB table & only take needed fields 
  const scan = new ScanCommand({
    TableName: CHANNEL_TABLE,
    ProjectionExpression: "#PK, #SK, #name, isLocked, #pk, #sk",
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
      "#pk": "pk",
      "#sk": "sk",
      "#name": "name",
    },
  });

  const result = await dbUser.send(scan);
  // If no items found -> return empty array
  const rows = (result.Items ?? []) as Array<Record<string, unknown>>;

  // function to get the first string value from key options
  const getStrFromKeys = (obj: Record<string, unknown>, ...keys: string[]) =>
    String(keys.map(k => obj[k]).find(v => typeof v === "string") ?? "");

  // 2) Keep only rows that are about channels (Type A or B)
  const channelRows = rows.filter((obj) => {
    const PKv = getStrFromKeys(obj, "PK", "pk");
    const SKv = getStrFromKeys(obj, "SK", "sk");

    // Type A: PK="CHANNEL", SK="CHANNEL#<name>"
    const patternA = PKv === "CHANNEL" && SKv.startsWith("CHANNEL#");
    // Type B: PK="CHANNEL#<name>", SK="META#INFO"
    const patternB = PKv.startsWith("CHANNEL#") && SKv === "META#INFO";

    return patternA || patternB;
  });

  // 3) Convert raw data into a simple list of { name, isLocked }
  const rawItems: ChannelMeta[] = channelRows.map((obj) => {
    const PKv = getStrFromKeys(obj, "PK", "pk");
    const SKv = getStrFromKeys(obj, "SK", "sk");

    // Try to read 'name' directly, if missing, get it from PK or SK
    let name = readStr(obj, "name");
    if (!name) {
      if (PKv.startsWith("CHANNEL#")) name = PKv.slice("CHANNEL#".length);
      else if (SKv.startsWith("CHANNEL#")) name = SKv.slice("CHANNEL#".length);
    }

    // Read isLocked flag (true = private, false = public)
    const isLocked = readBool(obj, "isLocked", false);

    return { name, isLocked };
  });

  // 4) Remove duplicates (channels with same name)
      // If same name appears more than once, combine isLocked using OR
  const byName = new Map<string, ChannelMeta>();
  for (const item of rawItems) {
    if (!item.name) continue; // skip if no name
    const existing = byName.get(item.name);
    if (existing) {
      // merge data if exists already
      byName.set(item.name, {
        name: item.name,
        isLocked: existing.isLocked || item.isLocked,
      });
    } else {
      byName.set(item.name, item);
    }
  }
  let items = Array.from(byName.values());

  // 5) If public mode -> only show unlocked channels
  if (!showLocked) {
    items = items.filter(ch => ch.isLocked !== true);
  }

  // Sort A-Z for display result
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

// Routes (API endpoints)
    // Public endpoint: anyone can call this
    // GET /api/channels  -> show only unlocked (public) channels
router.get("/", async (_req: Request, res: Response) => {
  try {
    const channels = await scanChannelMetas(false);
    return res.json({ success: true, channels });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[channels] list public error:", msg);
    return res.status(500).json({ success: false, message: "list failed" });
  }
});

// Private endpoint: only logged-in users (checked by requireAuth)
    // GET /api/channels/all  -> show all channels (locked + unlocked)
router.get("/all", requireAuth, async (_req: Request, res: Response) => {
  try {
    const channels = await scanChannelMetas(true);
    return res.json({ success: true, channels });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[channels] list all error:", msg);
    return res.status(500).json({ success: false, message: "list failed" });
  }
});

export default router;
