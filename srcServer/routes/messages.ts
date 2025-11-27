import { Router, type Request, type Response } from "express";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/requireAuth";
import { dbUser, USER_TABLE } from "../data/dynamoUser";

const router = Router();

// One chat message shape we use in this file
type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  channel?: string;
  dmId?: string;
};

// Request type with user info from requireAuth middleware
type AuthedRequest = Request & {
  user?: {
    id?: string;
    username?: string;
    name?: string;
  };
};

// Get current time as ISO string, for example "2025-11-26T13:45:00.000Z"
function nowIso(): string {
  return new Date().toISOString();
}

// Make sure value is string. If not string, return empty string.
function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/*
  Create and save one message to DynamoDB.

  If kind = "channel":
    - Save under PK = "CHANNEL#<channelName>"

  If kind = "dm":
    - Save under PK = "DM#<dmId>"   (this dmId is the same as old data style)

  After saving, return a ChatMessage object.
*/
async function createMessage(
  params:
    | {
        kind: "channel";
        author: string;
        channel: string;
        text: string;
      }
    | {
        kind: "dm";
        author: string;
        dmId: string;
        text: string;
      }
): Promise<ChatMessage> {
  const createdAt = nowIso();
  const sk = `MSG#${createdAt}#${randomUUID()}`;

  // Create channel message
  if (params.kind === "channel") {
    const channelName = params.channel;

    const item = {
      PK: `CHANNEL#${channelName}`,
      SK: sk,
      id: sk,
      kind: "channel",
      channel: channelName,
      author: params.author,
      text: params.text,
      createdAt,
    };

    await dbUser.send(
      new PutCommand({
        TableName: USER_TABLE,
        Item: item,
      })
    );

    return {
      id: item.id,
      author: item.author,
      text: item.text,
      createdAt: item.createdAt,
      channel: item.channel,
    };
  }

  // Create DM message
  const rawDmId = params.dmId;

  // If dmId already starts with "DM#", keep it.
  // If not, add "DM#" in front so it matches old data.
  const conversationId = rawDmId.startsWith("DM#")
    ? rawDmId
    : `DM#${rawDmId}`;

  const item = {
    PK: conversationId,
    SK: sk,
    id: sk,
    kind: "dm",
    dmId: conversationId,
    author: params.author,
    text: params.text,
    createdAt,
  };

  await dbUser.send(
    new PutCommand({
      TableName: USER_TABLE,
      Item: item,
    })
  );

  return {
    id: item.id,
    author: item.author,
    text: item.text,
    createdAt: item.createdAt,
    dmId: item.dmId,
  };
}

/*
  Convert raw DynamoDB item to ChatMessage.

  This function makes sure all important fields are strings
  and fills some safe default values if something is missing.
*/
function mapItemToMessage(item: Record<string, unknown>): ChatMessage {
  const id =
    safeString(item.id) ||
    safeString(item.SK) ||
    `msg-${randomUUID()}`;

  const author = safeString(item.author) || "unknown";
  const text = safeString(item.text);
  const createdAt =
    safeString(item.createdAt) || safeString(item.time) || nowIso();
  const channel = safeString(item.channel) || undefined;
  const dmId = safeString(item.dmId) || undefined;

  return {
    id,
    author,
    text,
    createdAt,
    channel,
    dmId,
  };
}

/*
  GET /api/messages

  Query options:
    kind=channel&channel=<name>   → load messages for one channel
    kind=dm&dmId=<id>             → load messages for one DM conversation

  For channels:
    1) Try new pattern PK = "CHANNEL#<name>"
    2) If no items, try old pattern PK = "MSG#CHANNEL#<name>"

  For DMs:
    - Always use PK = "DM#<dmId>"  (same as old data)
*/
router.get("/", async (req: Request, res: Response) => {
  try {
    const kindRaw = safeString(req.query.kind);
    const kind = kindRaw === "dm" ? "dm" : "channel";

    // Load messages for one channel
    if (kind === "channel") {
      const channelName = safeString(req.query.channel).trim();

      if (!channelName) {
        res.status(400).json({ message: "channel is required" });
        return;
      }

      // First: try new PK style "CHANNEL#<name>"
      const primaryParams = {
        TableName: USER_TABLE,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "PK",
        },
        ExpressionAttributeValues: {
          ":pk": `CHANNEL#${channelName}`,
        },
        ScanIndexForward: true,
      };

      const primaryResult = await dbUser.send(
        new QueryCommand(primaryParams)
      );

      let items = primaryResult.Items ?? [];

      // If nothing found, try old PK style "MSG#CHANNEL#<name>"
      if (items.length === 0) {
        const legacyParams = {
          TableName: USER_TABLE,
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: {
            "#pk": "PK",
          },
          ExpressionAttributeValues: {
            ":pk": `MSG#CHANNEL#${channelName}`,
          },
          ScanIndexForward: true,
        };

        const legacyResult = await dbUser.send(
          new QueryCommand(legacyParams)
        );
        items = legacyResult.Items ?? [];
      }

      const messages = items.map((item) =>
        mapItemToMessage(item as Record<string, unknown>)
      );

      res.json(messages);
      return;
    }

    // Load messages for one DM conversation
    const dmIdRaw = safeString(req.query.dmId).trim();

    if (!dmIdRaw) {
      res.status(400).json({ message: "dmId is required for dm kind" });
      return;
    }

    const conversationId = dmIdRaw.startsWith("DM#")
      ? dmIdRaw
      : `DM#${dmIdRaw}`;

    const params = {
      TableName: USER_TABLE,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "PK",
      },
      ExpressionAttributeValues: {
        ":pk": conversationId,
      },
      ScanIndexForward: true,
    };

    const result = await dbUser.send(new QueryCommand(params));
    const items = result.Items ?? [];

    const messages = items.map((item) =>
      mapItemToMessage(item as Record<string, unknown>)
    );

    res.json(messages);
  } catch (err) {
    console.error("GET /api/messages error:", err);
    res.status(500).json({ message: "Failed to load messages" });
  }
});

/*
  POST /api/messages/public

  This is for guest user (not logged in).
  Guest can only send messages in channel "general".

  Body JSON:
    {
      "channel": "general",
      "text": "hello"
    }
*/
router.post(
  "/public",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const channelName = safeString(req.body.channel).trim();
      const text = safeString(req.body.text).trim();

      if (!channelName || !text) {
        res.status(400).json({ message: "channel and text are required" });
        return;
      }

      if (channelName.toLowerCase() !== "general") {
        res
          .status(403)
          .json({ message: "Guests can only send messages in #general" });
        return;
      }

      const message = await createMessage({
        kind: "channel",
        author: "Guest",
        channel: channelName,
        text,
      });

      res.status(201).json(message);
    } catch (err) {
      console.error("POST /api/messages/public error:", err);
      res.status(500).json({ message: "Failed to send public message" });
    }
  }
);

/*
  POST /api/messages

  This is for logged-in users only (middleware requireAuth).

  For channel message:
    Body:
      {
        "kind": "channel",
        "channel": "general",
        "text": "hello"
      }

  For DM message:
    Body:
      {
        "kind": "dm",
        "dmId": "DM#admin#koi"   or "admin#koi" etc,
        "text": "hi"
      }
*/
router.post(
  "/",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const kindRaw = safeString(req.body.kind);
      const kind = kindRaw === "dm" ? "dm" : "channel";

      const text = safeString(req.body.text).trim();
      if (!text) {
        res.status(400).json({ message: "text is required" });
        return;
      }

      const author =
        req.user?.username || req.user?.name || "unknown-user";

      // Send message in channel
      if (kind === "channel") {
        const channelName = safeString(req.body.channel).trim();

        if (!channelName) {
          res.status(400).json({ message: "channel is required" });
          return;
        }

        const message = await createMessage({
          kind: "channel",
          author,
          channel: channelName,
          text,
        });

        res.status(201).json(message);
        return;
      }

      // Send message in DM
      const dmId = safeString(req.body.dmId).trim();

      if (!dmId) {
        res.status(400).json({ message: "dmId is required for dm message" });
        return;
      }

      const message = await createMessage({
        kind: "dm",
        author,
        dmId,
        text,
      });

      res.status(201).json(message);
    } catch (err) {
      console.error("POST /api/messages error:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  }
);

export default router;
