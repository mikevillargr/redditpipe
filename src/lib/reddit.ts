interface RedditToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: RedditToken | null = null;

const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

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
      "User-Agent": `RedditOutreachPipeline/1.0 by ${username}`,
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
  options: { sort?: string; time?: string; limit?: number } = {}
): Promise<RedditThread[]> {
  const { sort = "new", time = "day", limit = 10 } = options;

  await rateLimitWait();

  const params = new URLSearchParams({
    q: keyword,
    sort,
    t: time,
    limit: String(limit),
    type: "link",
  });

  const response = await fetch(`https://oauth.reddit.com/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "RedditOutreachPipeline/1.0",
    },
  });

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

export interface RedditComment {
  author: string;
  body: string;
  score: number;
}

export async function getThreadComments(
  token: string,
  threadId: string,
  subreddit: string
): Promise<RedditComment[]> {
  await rateLimitWait();

  const response = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/comments/${threadId}?sort=best&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "RedditOutreachPipeline/1.0",
      },
    }
  );

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
