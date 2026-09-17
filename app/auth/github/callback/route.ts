import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { createSession } from "@/lib/session";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/session-core";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  avatar_url: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

  if (!code || !state || !expectedState || state !== expectedState) {
    return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    return Response.json(
      { error: "GitHub OAuth is not configured" },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const tokenData = (await tokenRes.json()) as GitHubTokenResponse;

  if (!tokenData.access_token) {
    return Response.json(
      { error: tokenData.error_description ?? "Failed to obtain access token" },
      { status: 400 }
    );
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "todo-app",
    },
  });

  if (!userRes.ok) {
    return Response.json({ error: "Failed to fetch GitHub profile" }, { status: 400 });
  }

  const githubUser = (await userRes.json()) as GitHubUserResponse;

  await connectDB();

  const user = await User.findOneAndUpdate(
    { githubId: String(githubUser.id) },
    { githubId: String(githubUser.id), username: githubUser.login, avatarUrl: githubUser.avatar_url },
    { upsert: true, returnDocument: "after" }
  );

  await createSession(user._id.toString(), user.tokenVersion);

  return Response.redirect(new URL("/", request.url), 302);
}
