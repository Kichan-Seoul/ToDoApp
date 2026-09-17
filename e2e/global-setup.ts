import fs from "node:fs";
import path from "node:path";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { encrypt, SESSION_TTL_MS } from "@/lib/session-core";

const AUTH_FILE = path.join(__dirname, ".auth", "state.json");
export const E2E_GITHUB_ID = "e2e-test-user";

export default async function globalSetup() {
  await connectDB();

  const user = await User.findOneAndUpdate(
    { githubId: E2E_GITHUB_ID },
    {
      githubId: E2E_GITHUB_ID,
      username: "e2e-test-user",
      avatarUrl: "https://avatars.githubusercontent.com/u/0",
    },
    { upsert: true, returnDocument: "after" }
  );

  const token = await encrypt({ userId: user._id.toString(), tokenVersion: user.tokenVersion });
  const expires = Math.floor((Date.now() + SESSION_TTL_MS) / 1000);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({
      cookies: [
        {
          name: "session",
          value: token,
          domain: "127.0.0.1",
          path: "/",
          expires,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    })
  );
}
