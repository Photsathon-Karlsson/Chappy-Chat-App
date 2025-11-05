// Login a user by username & password
//   1. validate body
//   2. find user by username  (supports both old + new user rows)
//   3. check password
//   4. create JWT token

import express, { type Router, type Request, type Response } from "express";
import { ScanCommand } from "@aws-sdk/lib-dynamodb"; // Scan table
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { dbUser, USER_TABLE } from "../data/dynamoUser.js";

const router: Router = express.Router();

type LoginResponse = {
  success: boolean;
  token?: string;
  message?: string;
};

// DynamoDB item (raw data)
type RawItem = Record<string, unknown>;

// Get a string value safely
const getStr = (obj: RawItem, key: string): string | undefined => {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
};

// Function to find user in DynamoDB by username
//   - support new rows:   PK = "USER",  SK = "USER#<uuid>"
//   - support old rows:   PK = "USER#1", SK = "PROFILE#1"
//   - support old "name" field (not "username")
async function findUserByUsername(username: string): Promise<RawItem | null> {
  // scan all items, then filter by PK + username/name 
  const scan = new ScanCommand({
    TableName: USER_TABLE,
    ProjectionExpression: "#PK, #SK, username, #nm, password, userId", 
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
      "#nm": "name",
    },
  });

  const out = await dbUser.send(scan);
  const items = (out.Items ?? []) as RawItem[];

  // Filter in JS instead of using FilterExpression
  const user = items.find((it) => {
    const pk = getStr(it, "PK");
    // Check if row looks like a user row
    const isUserRow = pk === "USER" || (pk?.startsWith("USER#") ?? false);

    if (!isUserRow) return false;

    const uname = getStr(it, "username"); // new field
    const name = getStr(it, "name"); // old field
    return uname === username || name === username;
  });

  if (!user) {
    console.log("[login] user not found after scan:", username);
    return null;
  }

  console.log("[login] found user row for:", username, "PK=", user.PK, "SK=", user.SK);
  return user;
}

// Zod schema for login body: check username & password
const LoginBody = z.object({
  username: z.string().min(3, "username must be at least 3 chars"),
  password: z.string().min(4, "password must be at least 4 chars"),
});

// POST /api/login
router.post(
  "/",
  async (
    req: Request<Record<string, never>, LoginResponse, z.infer<typeof LoginBody>>,
    res: Response<LoginResponse>
  ) => {
    // 1. Validate the request body
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "invalid body";
      return res.status(400).json({ success: false, message: msg });
    }
    const { username, password } = parsed.data;

    try {
      // 2. Find user by username (new or old style)
      const raw = await findUserByUsername(username);

      // If there is no matching user row at all
      if (!raw) {
        return res
          .status(401)
          .json({ success: false, message: "username or password is wrong" });
      }

      // Read data safely from DynamoDB
      const hashedOrPlain = getStr(raw, "password");
      // support both "username" (new) and "name" (old)
      const nameFromItem =
        getStr(raw, "username") ?? getStr(raw, "name") ?? undefined;
      const pkUpper = getStr(raw, "PK");
      const skUpper = getStr(raw, "SK");

      // if no user or no password found, login fails
      if (!hashedOrPlain || !nameFromItem) {
        console.log("[login] malformed user row:", username, "raw:", raw);
        return res
          .status(401)
          .json({ success: false, message: "username or password is wrong" });
      }

      // 3. Check password
            // bcrypt hash -> use compare
            // plain text  -> direct compare 
      let ok = false;
      if (hashedOrPlain.startsWith("$2")) {
        ok = await compare(password, hashedOrPlain);
      } else {
        ok = password === hashedOrPlain;
      }

      if (!ok) {
        console.log("[login] password mismatch for:", username);
        return res
          .status(401)
          .json({ success: false, message: "username or password is wrong" });
      }

      // 4. Create a JWT token
      //   secret = key used to sign the token
      //   sub = user ID
      //   expiresIn = how long the token is valid (2 hrs)
      const secret = process.env.JWT_SECRET || "dev-secret-only";

      // Try to get a stable userId from:
      //   - userId attribute (if exists)
      //   - PK like "USER#<id>"
      //   - SK like "USER#<id>"
      //   - fallback to username
      let userId =
        getStr(raw, "userId") ??
        (pkUpper && pkUpper.startsWith("USER#")
          ? pkUpper.slice("USER#".length)
          : undefined) ??
        (skUpper && skUpper.startsWith("USER#")
          ? skUpper.slice("USER#".length)
          : undefined) ??
        nameFromItem;

      if (!userId) {
        // last fallback
        userId = username;
      }

      const token = jwt.sign(
        { sub: userId, username: nameFromItem },
        secret,
        { expiresIn: "2h" }
      );

      // login successful -> return the token
      return res.status(200).json({ success: true, token });
    } catch (err: unknown) {
      // Error -> something went wrong (DynamoDB or JWT error)
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : "unknown";
      console.error("[login] Dynamo/JWT error:", msg);
      return res.status(500).json({ success: false, message: "login failed" });
    }
  }
);

export default router;
