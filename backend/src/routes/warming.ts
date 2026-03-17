import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { getValidModel } from "../lib/models.js";

const app = new Hono();

async function getSpecialInstructions(): Promise<string | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return settings?.specialInstructions || null;
}

interface TrendingTopic {
  title: string;
  subreddit: string;
  url: string;
  score: number;
  commentCount: number;
  snippet: string;
  suggestedAction: "reply" | "new_thread";
  category: "trending" | "discussion" | "question" | "news";
  source: "reddit" | "news";
}

// ── News fetching via DuckDuckGo ────────────────────────────────────────────
interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

async function fetchTrendingNews(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  
  // Try Google News RSS first (most reliable, no auth needed)
  try {
    const res = await fetch("https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RedditPipe/2.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const xml = await res.text();
      // Match title and link separately - description is complex with nested HTML
      const titleMatches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/gi);
      let count = 0;
      for (const m of titleMatches) {
        if (count >= 15) break;
        // Remove CDATA wrapper if present
        let title = m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        const url = m[2].trim();
        
        // Extract first sentence as snippet from title
        const snippet = title.split(/[.!?]/)[0].slice(0, 150);
        
        items.push({ 
          title, 
          url, 
          snippet, 
          source: "Google News" 
        });
        count++;
      }
      console.log(`[Warming] Fetched ${items.length} news items from Google News RSS`);
    } else {
      console.warn(`[Warming] Google News RSS fetch failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[Warming] Google News RSS fetch error:", err);
  }
  
  return items;
}

// GET /api/warming/trending — fetch trending Reddit topics + news for account warming
app.get("/trending", async (c) => {
  try {
    const subreddits = c.req.query("subreddits")?.split(",").filter(Boolean) || [];

    const defaultSubs = [
      "AskReddit", "todayilearned", "LifeProTips", "explainlikeimfive",
      "CasualConversation", "NoStupidQuestions", "technology", "personalfinance",
      "productivity", "books", "movies", "gaming", "fitness", "cooking",
      "DIY", "smallbusiness", "Entrepreneur",
    ];
    const targetSubs = subreddits.length > 0 ? subreddits : defaultSubs;

    const topics: TrendingTopic[] = [];

    // Get Reddit OAuth token for authenticated requests
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const { getRedditAccessToken } = await import("../lib/reddit.js");
    let redditToken: string | null = null;
    let useOAuth = false;
    
    try {
      if (settings?.redditClientId && settings?.redditClientSecret && settings?.redditUsername && settings?.redditPassword) {
        redditToken = await getRedditAccessToken(
          settings.redditClientId,
          settings.redditClientSecret,
          settings.redditUsername,
          settings.redditPassword
        );
        useOAuth = true;
      } else {
        console.log("[Warming] Using public JSON endpoints (OAuth not configured)");
      }
    } catch (err) {
      console.warn("[Warming] Failed to get Reddit OAuth token, falling back to public JSON:", err);
    }

    // Fetch Reddit trending - use OAuth or public JSON based on credentials
    const redditUrls = useOAuth
      ? [
          "https://oauth.reddit.com/r/popular/hot?limit=15",
          ...targetSubs.slice(0, 5).map((s) => `https://oauth.reddit.com/r/${s}/hot?limit=5`),
        ]
      : [
          "https://www.reddit.com/r/popular/hot.json?limit=15",
          ...targetSubs.slice(0, 5).map((s) => `https://www.reddit.com/r/${s}/hot.json?limit=5`),
        ];

    const [newsItems] = await Promise.all([
      fetchTrendingNews(),
    ]);

    // Add news items as topics
    for (const news of newsItems) {
      topics.push({
        title: news.title,
        subreddit: news.source,
        url: news.url,
        score: 0,
        commentCount: 0,
        snippet: news.snippet,
        suggestedAction: "new_thread",
        category: "news",
        source: "news",
      });
    }

    // Fetch Reddit topics
    for (const apiUrl of redditUrls) {
      try {
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (compatible; RedditPipe/2.0)",
        };
        if (useOAuth && redditToken) {
          headers["Authorization"] = `Bearer ${redditToken}`;
        }
        
        const res = await fetch(apiUrl, {
          headers,
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) {
          console.warn(`[Warming] Reddit fetch failed for ${apiUrl}: ${res.status}`);
          continue;
        }
        const data = await res.json() as {
          data: {
            children: Array<{
              data: {
                title: string;
                subreddit: string;
                permalink: string;
                score: number;
                num_comments: number;
                selftext: string;
                link_flair_text: string | null;
                over_18: boolean;
                stickied: boolean;
              };
            }>;
          };
        };

        for (const child of data.data.children) {
          const post = child.data;
          if (post.over_18 || post.stickied) continue;

          const titleLower = post.title.toLowerCase();
          let category: TrendingTopic["category"] = "trending";
          if (/\?|how|what|why|should|recommend|help|advice|looking for/i.test(titleLower)) {
            category = "question";
          } else if (post.num_comments > 50) {
            category = "discussion";
          }

          topics.push({
            title: post.title,
            subreddit: post.subreddit,
            url: `https://www.reddit.com${post.permalink}`,
            score: post.score,
            commentCount: post.num_comments,
            snippet: post.selftext?.slice(0, 200) || "",
            suggestedAction: category === "question" ? "reply" : "reply",
            category,
            source: "reddit",
          });
        }

        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`[Warming] Reddit fetch error for ${apiUrl}:`, err);
      }
    }
    
    console.log(`[Warming] Total topics before dedup: ${topics.length} (${topics.filter(t => t.source === 'news').length} news, ${topics.filter(t => t.source === 'reddit').length} reddit)`);

    // Dedupe and sort
    const seen = new Set<string>();
    const unique = topics.filter((t) => {
      if (seen.has(t.url)) return false;
      seen.add(t.url);
      return true;
    });
    // News first, then by engagement
    unique.sort((a, b) => {
      if (a.source === "news" && b.source !== "news") return -1;
      if (a.source !== "news" && b.source === "news") return 1;
      return (b.score + b.commentCount * 2) - (a.score + a.commentCount * 2);
    });

    return c.json({
      topics: unique.slice(0, 40),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/warming/trending error:", error);
    return c.json({ error: "Failed to fetch trending topics" }, 500);
  }
});

// POST /api/warming/generate — AI-generate thread ideas, reply drafts, or full thread posts
app.post("/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { type, topic, subreddit, newsContext } = body as {
      type: "thread_ideas" | "reply_draft" | "thread_post" | "persona" | "writing_style";
      topic?: string;
      subreddit?: string;
      newsContext?: string;
    };

    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return c.json({ error: "No AI API key configured — add your Anthropic key in Settings" }, 400);

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const ai = new Anthropic({ apiKey });
    const model = getValidModel((settings as Record<string, unknown>)?.aiModelReplies as string | undefined);

    if (type === "thread_ideas") {
      const newsHint = newsContext ? `\n\nHere are today's trending news topics for inspiration:\n${newsContext}` : "";
      let systemPrompt = `You help Reddit users come up with engaging thread ideas for account warming.
Generate 6 interesting thread ideas that would get organic engagement.
Each idea should include a title, the best subreddit to post it in, and a hook.
Return ONLY a JSON array: [{"title": "...", "subreddit": "...", "hook": "..."}]

GUIDELINES:
- Topics should be genuinely interesting, thought-provoking, or helpful — NOT promotional
- Mix of: questions, interesting observations, hot takes, helpful tips, discussion starters
- Use a variety of popular subreddits (AskReddit, technology, personalfinance, Entrepreneur, etc.)
- If news topics are provided, create Reddit-appropriate threads inspired by them
- Titles should be catchy and encourage clicks/engagement
- Hooks should be 1-2 sentences describing what the post body would contain`;
      const specialInstructions = await getSpecialInstructions();
      if (specialInstructions) {
        systemPrompt += `\n\nSPECIAL INSTRUCTIONS:\n${specialInstructions}`;
      }
      const res = await ai.messages.create({
        model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: subreddit
            ? `Generate thread ideas specifically for r/${subreddit}${newsHint}`
            : `Generate diverse thread ideas across popular subreddits that would get good engagement${newsHint}`,
        }],
      });

      const text = res.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        let json = text.text.trim();
        if (json.startsWith("```")) json = json.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        return c.json({ ideas: JSON.parse(json) });
      }
      return c.json({ error: "AI returned empty response" }, 500);
    }

    if (type === "reply_draft" && topic) {
      let systemPrompt = `You write helpful, natural Reddit replies for account warming.
The reply should be genuinely helpful, conversational, and NOT promotional.
It should sound like a real person sharing their experience or knowledge.
Keep it 2-4 sentences. Be specific and add value. Match the tone of the subreddit.`;
      const specialInstructions = await getSpecialInstructions();
      if (specialInstructions) {
        systemPrompt += `\n\nSPECIAL INSTRUCTIONS:\n${specialInstructions}`;
      }
      const res = await ai.messages.create({
        model,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Write a warm, helpful reply to this Reddit post:\n\nTitle: ${topic}\n${subreddit ? `Subreddit: r/${subreddit}` : ""}`,
        }],
      });

      const text = res.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        return c.json({ reply: text.text.trim() });
      }
      return c.json({ error: "AI returned empty response" }, 500);
    }

    if (type === "thread_post" && topic) {
      let systemPrompt = `You write engaging Reddit thread posts for account warming.
Given a topic or news headline, write a complete Reddit post (title + body).
Also recommend the best subreddit to post it in.

Return ONLY JSON: {"title": "...", "body": "...", "subreddit": "...", "tips": "..."}

GUIDELINES:
- Title should be catchy and encourage engagement
- Body should be 2-4 paragraphs, conversational, genuine
- Add a question at the end to encourage comments
- tips: 1-sentence posting tip (best time to post, flair to use, etc.)
- NOT promotional — purely for building karma and engagement
- Sound like a real person, not a bot`;
      const specialInstructions = await getSpecialInstructions();
      if (specialInstructions) {
        systemPrompt += `\n\nSPECIAL INSTRUCTIONS:\n${specialInstructions}`;
      }
      const res = await ai.messages.create({
        model,
        max_tokens: 800,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Create a Reddit post based on this topic:\n\n"${topic}"\n${subreddit ? `Target subreddit: r/${subreddit}` : "Recommend the best subreddit for this topic."}`,
        }],
      });

      const text = res.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        let json = text.text.trim();
        if (json.startsWith("```")) json = json.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        return c.json({ post: JSON.parse(json) });
      }
      return c.json({ error: "AI returned empty response" }, 500);
    }

    if (type === "persona") {
      const res = await ai.messages.create({
        model,
        max_tokens: 400,
        system: `You generate realistic Reddit user personas for account warming.
Create a brief personality summary (2-3 sentences) that describes a believable Reddit user.
Include: interests, tone, expertise areas, and general vibe.
Make it natural and authentic — not promotional.`,
        messages: [{
          role: "user",
          content: "Generate a unique Reddit user personality summary.",
        }],
      });

      const text = res.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        return c.json({ persona: text.text.trim() });
      }
      return c.json({ error: "AI returned empty response" }, 500);
    }

    if (type === "writing_style") {
      const res = await ai.messages.create({
        model,
        max_tokens: 300,
        system: `You generate writing style guidelines for Reddit accounts.
Create brief notes (2-3 sentences) describing a natural writing style.
Include: tone, sentence structure, use of emojis/slang, formality level.
Make it realistic and varied — not robotic.`,
        messages: [{
          role: "user",
          content: "Generate writing style notes for a Reddit account.",
        }],
      });

      const text = res.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        return c.json({ style: text.text.trim() });
      }
      return c.json({ error: "AI returned empty response" }, 500);
    }

    return c.json({ error: "Invalid request type" }, 400);
  } catch (error) {
    console.error("POST /api/warming/generate error:", error);
    return c.json({ error: `Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}` }, 500);
  }
});

export default app;
