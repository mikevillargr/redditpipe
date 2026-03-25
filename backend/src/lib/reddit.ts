import { prisma } from "./prisma.js";

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
const CONFIG_TTL_MS = 60_000;

// ── Rate Limiter ────────────────────────────────────────────────────────────

let lastRequestTime = 0;
let baseDelay = 3000;

export function resetRateLimiter(mode: "oauth" | "public_json" = "public_json"): void {
  lastRequestTime = 0;
  baseDelay = mode === "oauth" ? 1500 : 3000;
}

const MAX_RETRIES = 3;
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function redditFetch(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < baseDelay) {
        await delay(baseDelay - elapsed);
      }
      lastRequestTime = Date.now();

      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const backoff = retryAfter
          ? Math.min(parseFloat(retryAfter) * 1000 + 500, 30_000)
          : Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 30_000);
        console.warn(`[Reddit RL] 429 (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Backing off ${(backoff / 1000).toFixed(1)}s`);
        if (attempt < MAX_RETRIES) { await delay(backoff); continue; }
      }

      if (response.status === 403 && attempt < MAX_RETRIES) {
        const backoff = 5000 * Math.pow(2, attempt) + Math.random() * 2000;
        console.warn(`[Reddit RL] 403 Forbidden (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Backing off ${(backoff / 1000).toFixed(1)}s`);
        await delay(backoff);
        continue;
      }

      if ((response.status === 503 || response.status === 502) && attempt < MAX_RETRIES) {
        const backoff = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`[Reddit RL] ${response.status} (attempt ${attempt + 1}). Retrying in ${(backoff / 1000).toFixed(1)}s`);
        await delay(backoff);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const backoff = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`[Reddit RL] Error (attempt ${attempt + 1}): ${lastError.message}. Retrying in ${(backoff / 1000).toFixed(1)}s`);
        await delay(backoff);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Reddit request failed after max retries");
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
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    delayMs: mode === "oauth" ? 1500 : 3000,
  };
  configCachedAt = Date.now();
  baseDelay = cachedConfig.delayMs;

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
      "User-Agent": `RedditPipe/2.0 by ${username}`,
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  });

  if (!response.ok) throw new Error(`Reddit auth failed: ${response.status} ${response.statusText}`);
  const data = await response.json();
  if (data.error) throw new Error(`Reddit auth error: ${data.error}`);

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

// ── Search ───────────────────────────────────────────────────────────────────

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

  const params = new URLSearchParams({ q: keyword, sort, t: time, limit: String(limit), type: "link" });

  const url = cfg.mode === "oauth" && cfg.token
    ? `https://oauth.reddit.com/search?${params}`
    : `https://www.reddit.com/search.json?${params}`;
  const headers: Record<string, string> = { "User-Agent": cfg.userAgent };
  if (cfg.mode === "oauth" && cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;

  const response = await redditFetch(url, { headers });
  if (!response.ok) throw new Error(`Reddit search failed: ${response.status} ${response.statusText}`);
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

  const params = new URLSearchParams({ q: keyword, sort, t: time, limit: String(limit), type: "comment" });

  const url = cfg.mode === "oauth" && cfg.token
    ? `https://oauth.reddit.com/search?${params}`
    : `https://www.reddit.com/search.json?${params}`;
  const headers: Record<string, string> = { "User-Agent": cfg.userAgent };
  if (cfg.mode === "oauth" && cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;

  const response = await redditFetch(url, { headers });
  if (!response.ok) throw new Error(`Reddit comment search failed: ${response.status} ${response.statusText}`);
  const data = await response.json();

  return (data.data?.children || []).map(
    (child: { data: { id: string; body: string; subreddit: string; score: number; created_utc: number; permalink: string; link_title: string; link_url: string; link_id: string } }) => ({
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

// ── Thread comments ──────────────────────────────────────────────────────────

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

  const url = cfg.mode === "oauth" && cfg.token
    ? `https://oauth.reddit.com/r/${subreddit}/comments/${threadId}?sort=best&limit=5`
    : `https://www.reddit.com/r/${subreddit}/comments/${threadId}.json?sort=best&limit=5`;
  const headers: Record<string, string> = { "User-Agent": cfg.userAgent };
  if (cfg.mode === "oauth" && cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;

  const response = await redditFetch(url, { headers });
  if (!response.ok) throw new Error(`Reddit comments fetch failed: ${response.status} ${response.statusText}`);
  const data = await response.json();

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

// ── User profile & comments ──────────────────────────────────────────────────

export interface RedditUserProfile {
  name: string;
  created_utc: number;
  link_karma: number;
  comment_karma: number;
  is_suspended: boolean;
}

export async function getUserProfile(username: string): Promise<RedditUserProfile> {
  const response = await redditFetch(`https://www.reddit.com/user/${username}/about.json`, {
    headers: { "User-Agent": "RedditPipe/2.0 (internal tool)" },
  });
  if (!response.ok) throw new Error(`Reddit profile fetch failed: ${response.status} ${response.statusText}`);
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
  permalink: string;
}

export async function getUserComments(username: string, limit: number = 25): Promise<RedditUserComment[]> {
  const response = await redditFetch(
    `https://www.reddit.com/user/${username}/comments.json?limit=${limit}&sort=new`,
    { headers: { "User-Agent": "RedditPipe/2.0 (internal tool)" } }
  );
  if (!response.ok) throw new Error(`Reddit user comments fetch failed: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return (data.data?.children || []).map(
    (child: { data: { subreddit: string; body: string; score: number; created_utc: number; link_id: string; permalink: string } }) => ({
      subreddit: child.data.subreddit,
      body: child.data.body,
      score: child.data.score,
      created_utc: child.data.created_utc,
      link_id: child.data.link_id,
      permalink: child.data.permalink,
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
    if (match) return { found: true, permalink: `https://www.reddit.com${match.permalink}` };
    return { found: false };
  } catch (error) {
    console.error("Verification failed:", error);
    return { found: false };
  }
}

/**
 * Post a comment on Reddit (reply to a comment or post)
 * @param parentId - Full thing ID (e.g., t1_abc123 for comment, t3_xyz789 for post)
 * @param text - Comment text
 * @param username - Reddit username (optional, for logging)
 * @param password - Reddit password (optional, for future OAuth implementation)
 * @returns Success status, comment ID, and permalink
 */
export async function postComment(
  parentId: string,
  text: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; commentId?: string; permalinkUrl?: string; error?: string }> {
  try {
    const config = await getRedditConfig();
    
    if (config.mode === "public_json") {
      return {
        success: false,
        error: "Cannot post comments with public_json mode. OAuth required.",
      };
    }

    // Get OAuth credentials from settings
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings?.redditClientId || !settings?.redditClientSecret || !settings?.redditUsername || !settings?.redditPassword) {
      return {
        success: false,
        error: "Reddit OAuth credentials not configured in settings",
      };
    }

    // Get OAuth token
    const token = await getRedditAccessToken(
      settings.redditClientId,
      settings.redditClientSecret,
      settings.redditUsername,
      settings.redditPassword
    );

    // Post comment via Reddit API
    const response = await redditFetch("https://oauth.reddit.com/api/comment", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RedditPipe/2.0",
      },
      body: new URLSearchParams({
        api_type: "json",
        text,
        thing_id: parentId,
      }).toString(),
    });

    const data = await response.json();

    if (data.json?.errors && data.json.errors.length > 0) {
      return {
        success: false,
        error: data.json.errors[0][1] || "Reddit API error",
      };
    }

    if (data.json?.data?.things && data.json.data.things.length > 0) {
      const comment = data.json.data.things[0].data;
      return {
        success: true,
        commentId: comment.id,
        permalinkUrl: `https://www.reddit.com${comment.permalink}`,
      };
    }

    return {
      success: false,
      error: "Unexpected API response format",
    };
  } catch (error) {
    console.error("Error posting comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post comment",
    };
  }
}
