// Message Routes (Channel & DM)

// - GET  /api/messages           -> get messages from channel or DM
// - POST /api/messages           -> send new message (need login)
// - POST /api/messages/public    -> guest can send message in #general

// DynamoDB table (2 key styles)
//   Channel messages:
//     Pattern A) PK="CHANNEL#<name>", SK="MSG#<time>#<uuid>"
//     Pattern B) PK="MSG#CHANNEL#<name>", SK="TS#<time>#<uuid>"
//   DM messages:
//     Pattern A) PK="DM#<userA>#<userB>", SK="MSG#<time>#<uuid>"
//     Pattern B) PK="MSG#DM#<userA>#<userB>", SK="TS#<time>#<uuid>"

// Use Pattern A for new data, Pattern B still supported for old records.

import express, { type Router, type Request, type Response } from "express";
import {
  QueryCommand,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireAuth } from "../middleware/requireAuth.js";
import { dbUser, CHANNEL_TABLE as USER_TABLE } from "../data/dynamoUser.js";
import { randomUUID } from "crypto";

const router: Router = express.Router();

// make sure JSON body is parsed even if global config changes
router.use(express.json());

// Types for request/response (Chat message object structure)
type ChatMessage = {
  id: string; // ex. "MSG#2025-11-03T08:30:00.000Z#uuid"
  kind: "channel" | "dm"; // message type
  channel?: string; // only used for channel messages
  dmId?: string; // only used for dm messages, ex. "DM#photsathon#boooo"
  author: string; // username (who sent the message)
  text: string; // message body/content
  createdAt: string; // ISO time format when message was created
  // extra fields for frontend convenience
  sender?: string; // duplicate of author
  time?: string; // short time "HH:MM"
};

type MessagesCreateBody = {
  kind?: string;
  text?: string;
  channel?: string;
  dmId?: string;
};

// Function to safely read a string value from a plain object
function readStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

// Function to check if string is not empty or just spaces
function isNonEmpty(s: string): boolean {
  return s.trim().length > 0;
}

// Function to get username from auth info (set by requireAuth middleware)
function getAuthUsernameFromLocals(res: Response): string {
  const u = res.locals?.user as { username?: string } | undefined;
  return typeof u?.username === "string" ? u.username : "";
}

// Function to read author from multiple possible keys
function readAuthor(obj: Record<string, unknown>): string {
  // Try several key names, pick the first non-empty
  return (
    readStr(obj, "author") ||
    readStr(obj, "sender") ||
    readStr(obj, "username") ||
    readStr(obj, "user")
  );
}

// Function to read text from multiple possible keys
function readMessageText(obj: Record<string, unknown>): string {
  // Main key is "text", fallback "message"
  return readStr(obj, "text") || readStr(obj, "message");
}

// read value from body or query (for safety when body is empty)
function readFromBody(req: Request, key: string): string {
  const body = req.body as MessagesCreateBody | undefined;
  const v = body?.[key as keyof MessagesCreateBody];
  return typeof v === "string" ? v : "";
}

function readFromQuery(req: Request, key: string): string {
  const q = (req.query as Record<string, unknown>)[key];
  return typeof q === "string" ? q : "";
}

function readBodyOrQuery(req: Request, key: string): string {
  const fromBody = readFromBody(req, key);
  if (isNonEmpty(fromBody)) return fromBody;
  return readFromQuery(req, key);
}

// Convert a DynamoDB item to ChatMessage (works for both patterns)
function mapItemToMessage(obj: Record<string, unknown>): ChatMessage | null {
  const PK = readStr(obj, "PK") || readStr(obj, "pk");
  const SK = readStr(obj, "SK") || readStr(obj, "sk");
  const text = readMessageText(obj);
  const author = readAuthor(obj);
  let createdAt = readStr(obj, "createdAt");
  let id = readStr(obj, "id");

  // Get ISO timestamp from SK key (ex. "MSG#<iso>#<uuid>" or "TS#<iso>#<uuid>")
  const parseFromKey = (s: string): string => {
    const parts = s.split("#");
    if (parts.length >= 2) {
      const iso = parts[1]; // part[1] should be ISO time
      if (iso && iso.includes("T")) return iso;
    }
    return "";
  };

  // If createdAt or id missing, try to get from SK
  if (!createdAt && SK) {
    createdAt = parseFromKey(SK);
  }
  if (!id) {
    id = SK || "";
  }

  // Check message type (channel or DM) from PK
  let kind: "channel" | "dm" | null = null;
  let channel: string | undefined;
  let dmId: string | undefined;

  // Pattern A
  if (PK.startsWith("CHANNEL#")) {
    kind = "channel";
    channel = PK.slice("CHANNEL#".length);
  } else if (PK.startsWith("DM#")) {
    kind = "dm";
    dmId = PK;
  } else {
    // Pattern B
    if (PK.startsWith("MSG#CHANNEL#")) {
      kind = "channel";
      channel = PK.slice("MSG#CHANNEL#".length);
    } else if (PK.startsWith("MSG#DM#")) {
      kind = "dm";
      dmId = "DM#" + PK.slice("MSG#DM#".length);
    }
  }

  // Skip invalid or empty data
  if (!kind || !isNonEmpty(text) || !isNonEmpty(author) || !isNonEmpty(createdAt)) {
    return null;
  }

  // create short time "HH:MM" for frontend
  let timeShort: string | undefined;
  if (createdAt.includes("T")) {
    const hhmm = createdAt.split("T")[1]?.slice(0, 5);
    if (hhmm) timeShort = hhmm;
  }

  // Return a clean ChatMessage object
  return {
    id,
    kind,
    channel,
    dmId,
    author,
    text,
    createdAt,
    sender: author,
    time: timeShort,
  };
}

// Build primary key (PK) for saving new messages (Pattern A)
function buildPk(
  kind: "channel" | "dm",
  channel?: string,
  dmId?: string
): string {
  if (kind === "channel" && channel) return `CHANNEL#${channel}`;
  if (kind === "dm" && dmId) return dmId;
  return "";
}

// Fetch messages from DynamoDB (try Pattern A first, then Pattern B)
async function fetchMessages(
  kind: "channel" | "dm",
  key: string,
  limit: number
): Promise<ChatMessage[]> {
  // Pattern A: query by PK with SK starting with "MSG#"
  const query = new QueryCommand({
    TableName: USER_TABLE,
    KeyConditionExpression: "#PK = :pk AND begins_with(#SK, :skpref)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: { ":pk": key, ":skpref": "MSG#" },
    ScanIndexForward: true, // sort oldest -> newest
    Limit: limit,
  });

  const qres = await dbUser.send(query);
  const qItems = (qres.Items ?? []) as Array<Record<string, unknown>>;
  let msgs = qItems
    .map(mapItemToMessage)
    .filter((x): x is ChatMessage => !!x);

  if (msgs.length > 0) {
    return msgs;
  }

  // If Pattern A not found, try Pattern B by scanning all records
  const scan = new ScanCommand({
    TableName: USER_TABLE,
    // Use #name for words that DynamoDB already uses (like "text" or "id")
    ProjectionExpression:
      "#PK, #SK, #text, #author, #createdAt, #id, #pk, #sk",
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
      "#pk": "pk",
      "#sk": "sk",
      "#text": "text",
      "#author": "author",
      "#createdAt": "createdAt",
      "#id": "id",
    },
  });

  const sres = await dbUser.send(scan);
  const rows = (sres.Items ?? []) as Array<Record<string, unknown>>;

  // Build the expected Pattern B PK based on kind + key
  let expectedPkB = "";
  if (kind === "channel") {
    // key comes as "CHANNEL#<name>" (Pattern A) -> Pattern B uses "MSG#CHANNEL#<name>"
    const chName = key.slice("CHANNEL#".length);
    expectedPkB = `MSG#CHANNEL#${chName}`;
  } else {
    // kind === "dm"; key is "DM#A#B" (Pattern A) -> Pattern B uses "MSG#DM#A#B"
    expectedPkB = `MSG#${key}`; // prepend MSG#
  }

  // Filter only messages that match our kind & key
  const filtered = rows.filter((obj) => {
    const PKb = readStr(obj, "PK") || readStr(obj, "pk");
    return PKb === expectedPkB;
  });

  msgs = filtered
    .map(mapItemToMessage)
    .filter((x): x is ChatMessage => !!x);

  // Sort messages by createdAt (ascending)
  msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return msgs.slice(0, limit);
}

// Create & save a new message (Pattern A write)
async function createMessage(params: {
  kind: "channel" | "dm";
  channel?: string;
  dmId?: string;
  author: string;
  text: string;
}): Promise<ChatMessage> {
  const now = new Date().toISOString();
  const uuid = randomUUID();

  // Create PK & SK
  const pk = buildPk(params.kind, params.channel, params.dmId);
  const sk = `MSG#${now}#${uuid}`;

  // Prepare message data to store in DynamoDB
  const item: Record<string, unknown> = {
    PK: pk,
    SK: sk,
    kind: params.kind,
    channel: params.kind === "channel" ? params.channel : undefined,
    dmId: params.kind === "dm" ? params.dmId : undefined,
    author: params.author,
    text: params.text,
    createdAt: now,
    id: sk,
  };

  // Add new item to table (skip if same PK + SK already exist)
  const put = new PutCommand({
    TableName: USER_TABLE,
    Item: item,
    ConditionExpression:
      "attribute_not_exists(#PK) AND attribute_not_exists(#SK)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
  });

  await dbUser.send(put);

  // create short time once here
  let timeShort: string | undefined;
  if (now.includes("T")) {
    const hhmm = now.split("T")[1]?.slice(0, 5);
    if (hhmm) timeShort = hhmm;
  }

  // Return the saved message
  return {
    id: sk,
    kind: params.kind,
    channel: params.channel,
    dmId: params.dmId,
    author: params.author,
    text: params.text,
    createdAt: now,
    sender: params.author,
    time: timeShort,
  };
}

// ROUTES START HERE

// GET /api/messages   -> list messages by channel or dm
router.get("/", async (req: Request, res: Response) => {
  try {
    const kind = String(req.query.kind || "").toLowerCase();
    const limit = Math.max(
      1,
      Math.min(200, Number(req.query.limit) || 50)
    ); // limit 1–200

    // If kind = channel -> need ?channel=<name>
    if (kind === "channel") {
      const channel = String(req.query.channel || "");
      if (!isNonEmpty(channel)) {
        return res
          .status(400)
          .json({ success: false, message: "channel is required" });
      }
      const pk = `CHANNEL#${channel}`;
      const messages = await fetchMessages("channel", pk, limit);
      return res.json({ success: true, messages });
    }

    // If kind = dm -> need ?dmId=DM#...
    if (kind === "dm") {
      const dmId = String(req.query.dmId || "");
      // Check dmId is not empty & starts with "DM#"
      if (!isNonEmpty(dmId) || !dmId.startsWith("DM#")) {
        return res.status(400).json({
          success: false,
          message: "dmId must start with DM#",
        });
      }
      // Get DM messages
      const messages = await fetchMessages("dm", dmId, limit);
      return res.json({ success: true, messages });
    }

    // Invalid kind (If kind is wrong)
    return res.status(400).json({
      success: false,
      message: "kind must be 'channel' or 'dm'",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[messages] list error:", msg);
    return res
      .status(500)
      .json({ success: false, message: "list failed" });
  }
});

// POST /api/messages/public  -> guest can send in #general without login
router.post("/public", async (req: Request, res: Response) => {
  try {
    const kind = readFromBody(req, "kind").toLowerCase();
    const text = readFromBody(req, "text");
    const channel = readFromBody(req, "channel");

    // Only allow channel messages to #general
    if (kind !== "channel" || channel !== "general") {
      return res
        .status(400)
        .json({ success: false, message: "only general channel is public" });
    }

    if (!isNonEmpty(text)) {
      return res
        .status(400)
        .json({ success: false, message: "text is required" });
    }

    // Guest does not have real account, use fixed name
    const author = "Guest";

    const saved = await createMessage({
      kind: "channel",
      channel,
      author,
      text,
    });

    return res.status(201).json({ success: true, message: saved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[messages] public create error:", msg);
    return res
      .status(500)
      .json({ success: false, message: "create failed" });
  }
});

// POST /api/messages  -> create a new message (require auth)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    // debug log (see raw body / query when debugging)
    console.log("[messages] create body:", req.body);
    console.log("[messages] create query:", req.query);

    // Get logged-in username (requireAuth puts user object on res.locals.user)
    const me = getAuthUsernameFromLocals(res);
    if (!isNonEmpty(me)) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized" });
    }

    const kindRaw = readBodyOrQuery(req, "kind").toLowerCase();
    const text = readBodyOrQuery(req, "text");

    if (!isNonEmpty(text)) {
      return res
        .status(400)
        .json({ success: false, message: "text is required" });
    }

    // Channel message
    if (kindRaw === "channel") {
      const channel = readBodyOrQuery(req, "channel");
      if (!isNonEmpty(channel)) {
        return res
          .status(400)
          .json({ success: false, message: "channel is required" });
      }
      const saved = await createMessage({
        kind: "channel",
        channel,
        author: me,
        text,
      });
      return res.status(201).json({ success: true, message: saved });
    }

    // DM message
    if (kindRaw === "dm") {
      const dmId = readBodyOrQuery(req, "dmId");
      if (!isNonEmpty(dmId) || !dmId.startsWith("DM#")) {
        return res.status(400).json({
          success: false,
          message: "dmId must start with DM#",
        });
      }
      const saved = await createMessage({
        kind: "dm",
        dmId,
        author: me,
        text,
      });
      return res.status(201).json({ success: true, message: saved });
    }

    // Invalid kind (If kind is wrong)
    return res.status(400).json({
      success: false,
      message: "kind must be 'channel' or 'dm'",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[messages] create error:", msg);
    return res
      .status(500)
      .json({ success: false, message: "create failed" });
  }
});

export default router;
