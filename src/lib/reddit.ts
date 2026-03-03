import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

interface RedditToken {
  accessToken: string;
  expiresAt: number;
}

export interface RedditConfig {
  mode: "oauth" | "public_json";
  token?: string;
  userAgent: string;
  delayMs: number;
}

// ── Cached state ─────────────────────────────────────────────────────────────

let cachedToken: RedditToken | null = null;
let cachedConfig: RedditConfig | null = null;
let configCachedAt = 0;
const CONFIG_TTL_MS = 60_000; // re-read settings at most once per minute

let lastRequestTime = 0;

async function rateLimitWait(delayMs?: number): Promise<void> {
  const delay = delayMs ?? cachedConfig?.delayMs ?? 1000;
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < delay) {
    await new Promise((resolve) => setTimeout(resolve, delay - elapsed));
  }
  lastRequestTime = Date.now();
}

// ── Config helper ────────────────────────────────────────────────────────────

export async function getRedditConfig(): Promise<RedditConfig> {
  if (cachedConfig && Date.now() - configCachedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  const mode = (settings?.redditApiMode === "oauth" ? "oauth" : "public_json") as "oauth" | "public_json";

  let token: string | undefined;
  if (
    mode === "oauth" &&
    settings?.redditClientId &&
    settings?.redditClientSecret &&
    settings?.redditUsername &&
    settings?.redditPassword
  ) {
    token = await getRedditAccessToken(
      settings.redditClientId,
      settings.redditClientSecret,
      settings.redditUsername,
      settings.redditPassword
    );
  }

  cachedConfig = {
    mode,
    token,
    userAgent: "RedditPipe/1.0 (internal tool)",
    delayMs: mode === "oauth" ? 1000 : 6000,
  };
  configCachedAt = Date.now();

  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
  configCachedAt = 0;
}

// ── OAuth token ──────────────────────────────────────────────────────────────

export async function getRedditAccessToken(
  clientId: string,
  clientSecret: string,
  username: string,
  password: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `RedditPipe/1.0 by ${username}`,
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Reddit auth error: ${data.error}`);
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

export interface RedditThread {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
}

export async function searchReddit(
  token: string,
  keyword: string,
  options: { sort?: string; time?: string; limit?: number } = {},
  config?: RedditConfig
): Promise<RedditThread[]> {
  const { sort = "new", time = "day", limit = 10 } = options;
  const cfg = config ?? await getRedditConfig();

  await rateLimitWait(cfg.delayMs);

  const params = new URLSearchParams({
    q: keyword,
    sort,
    t: time,
    limit: String(limit),
    type: "link",
  });

  let response: Response;
  if (cfg.mode === "oauth" && cfg.token) {
    response = await fetch(`https://oauth.reddit.com/search?${params}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "User-Agent": cfg.userAgent,
      },
    });
  } else {
    response = await fetch(`https://www.reddit.com/search.json?${params}`, {
      headers: { "User-Agent": cfg.userAgent },
    });
  }

  if (!response.ok) {
    throw new Error(`Reddit search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.data?.children || []).map((child: { data: RedditThread }) => ({
    id: child.data.id,
    title: child.data.title,
    selftext: child.data.selftext,
    subreddit: child.data.subreddit,
    score: child.data.score,
    num_comments: child.data.num_comments,
    created_utc: child.data.created_utc,
    permalink: child.data.permalink,
    url: child.data.url,
  }));
}

// ── Comment search ───────────────────────────────────────────────────────────

export interface RedditCommentSearchResult {
  id: string;
  body: string;
  subreddit: string;
  score: number;
  created_utc: number;
  permalink: string;
  link_title: string;
  link_url: string;
  link_id: string;
}

export async function searchRedditComments(
  token: string,
  keyword: string,
  options: { sort?: string; time?: string; limit?: number } = {},
  config?: RedditConfig
): Promise<RedditCommentSearchResult[]> {
  const { sort = "new", time = "day", limit = 10 } = options;
  const cfg = config ?? await getRedditConfig();

  await rateLimitWait(cfg.delayMs);

  const params = new URLSearchParams({
    q: keyword,
    sort,
    t: time,
    limit: String(limit),
    type: "comment",
  });

  let response: Response;
  if (cfg.mode === "oauth" && cfg.token) {
    response = await fetch(`https://oauth.reddit.com/search?${params}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "User-Agent": cfg.userAgent,
      },
    });
  } else {
    response = await fetch(`https://www.reddit.com/search.json?${params}`, {
      headers: { "User-Agent": cfg.userAgent },
    });
  }

  if (!response.ok) {
    throw new Error(`Reddit comment search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.data?.children || []).map(
    (child: {
      data: {
        id: string;
        body: string;
        subreddit: string;
        score: number;
        created_utc: number;
        permalink: string;
        link_title: string;
        link_url: string;
        link_id: string;
      };
    }) => ({
      id: child.data.id,
      body: child.data.body,
      subreddit: child.data.subreddit,
      score: child.data.score,
      created_utc: child.data.created_utc,
      permalink: child.data.permalink,
      link_title: child.data.link_title,
      link_url: child.data.link_url,
      link_id: child.data.link_id,
    })
  );
}

export interface RedditComment {
  author: string;
  body: string;
  score: number;
}

export async function getThreadComments(
  token: string,
  threadId: string,
  subreddit: string,
  config?: RedditConfig
): Promise<RedditComment[]> {
  const cfg = config ?? await getRedditConfig();

  await rateLimitWait(cfg.delayMs);

  let response: Response;
  if (cfg.mode === "oauth" && cfg.token) {
    response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/comments/${threadId}?sort=best&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "User-Agent": cfg.userAgent,
        },
      }
    );
  } else {
    response = await fetch(
      `https://www.reddit.com/r/${subreddit}/comments/${threadId}.json?sort=best&limit=5`,
      {
        headers: { "User-Agent": cfg.userAgent },
      }
    );
  }

  if (!response.ok) {
    throw new Error(`Reddit comments fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Reddit returns [listing_post, listing_comments]
  const commentsListing = data[1]?.data?.children || [];

  return commentsListing
    .filter((child: { kind: string }) => child.kind === "t1")
    .slice(0, 5)
    .map((child: { data: { author: string; body: string; score: number } }) => ({
      author: child.data.author,
      body: child.data.body,
      score: child.data.score,
    }));
}

export interface RedditUserProfile {
  name: string;
  created_utc: number;
  link_karma: number;
  comment_karma: number;
  is_suspended: boolean;
}

export async function getUserProfile(username: string): Promise<RedditUserProfile> {
  await rateLimitWait();

  const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
    headers: {
      "User-Agent": "RedditOutreachPipeline/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Reddit profile fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    name: data.data.name,
    created_utc: data.data.created_utc,
    link_karma: data.data.link_karma,
    comment_karma: data.data.comment_karma,
    is_suspended: data.data.is_suspended || false,
  };
}

export interface RedditUserComment {
  subreddit: string;
  body: string;
  score: number;
  created_utc: number;
  link_id: string;
}

export async function getUserComments(
  username: string,
  limit: number = 25
): Promise<RedditUserComment[]> {
  await rateLimitWait();

  const response = await fetch(
    `https://www.reddit.com/user/${username}/comments.json?limit=${limit}&sort=new`,
    {
      headers: {
        "User-Agent": "RedditOutreachPipeline/1.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Reddit user comments fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.data?.children || []).map(
    (child: {
      data: {
        subreddit: string;
        body: string;
        score: number;
        created_utc: number;
        link_id: string;
      };
    }) => ({
      subreddit: child.data.subreddit,
      body: child.data.body,
      score: child.data.score,
      created_utc: child.data.created_utc,
      link_id: child.data.link_id,
    })
  );
}

export async function verifyCommentOnThread(
  username: string,
  threadId: string
): Promise<{ found: boolean; permalink?: string }> {
  try {
    const comments = await getUserComments(username, 25);
    const match = comments.find((c) => c.link_id === `t3_${threadId}`);

    if (match) {
      return {
        found: true,
        permalink: `https://www.reddit.com/user/${username}/comments/`,
      };
    }

    return { found: false };
  } catch (error) {
    console.error("Verification failed:", error);
    return { found: false };
  }
}
