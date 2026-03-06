import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { getValidModel } from "../lib/models.js";

const app = new Hono();

// GET /api/clients
app.get("/", async (c) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { opportunities: true } },
        accountAssignments: { include: { account: { select: { id: true, username: true } } } },
      },
    });
    return c.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

// POST /api/clients
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, websiteUrl, description, keywords, mentionTerms, nuance, status } = body;

    if (!name || !websiteUrl || !description || !keywords) {
      return c.json({ error: "Missing required fields: name, websiteUrl, description, keywords" }, 400);
    }

    const keywordsStr = Array.isArray(keywords) ? keywords.join(", ") : keywords;
    const mentionStr = Array.isArray(mentionTerms) ? mentionTerms.join(", ") : (mentionTerms || null);

    const client = await prisma.client.create({
      data: { name, websiteUrl, description, keywords: keywordsStr, mentionTerms: mentionStr, nuance: nuance || null, status: status || "active" },
    });

    return c.json(client, 201);
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return c.json({ error: "Failed to create client" }, 500);
  }
});

// GET /api/clients/:id
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        opportunities: { orderBy: { createdAt: "desc" }, take: 20 },
        accountAssignments: { include: { account: true } },
      },
    });
    if (!client) return c.json({ error: "Not found" }, 404);
    return c.json(client);
  } catch (error) {
    console.error("GET /api/clients/:id error:", error);
    return c.json({ error: "Failed to fetch client" }, 500);
  }
});

// PUT /api/clients/:id
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    // Normalize arrays to comma-separated strings for DB storage
    if (Array.isArray(body.keywords)) body.keywords = body.keywords.join(", ");
    if (Array.isArray(body.mentionTerms)) body.mentionTerms = body.mentionTerms.join(", ");
    const client = await prisma.client.update({ where: { id }, data: body });
    return c.json(client);
  } catch (error) {
    console.error("PUT /api/clients/:id error:", error);
    return c.json({ error: "Failed to update client" }, 500);
  }
});

// DELETE /api/clients/:id
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await prisma.client.delete({ where: { id } });
    return c.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clients/:id error:", error);
    return c.json({ error: "Failed to delete client" }, 500);
  }
});

// ── helpers for deep site scraping ───────────────────────────────────────────
function filterMarketingFluff(keywords: string[]): string[] {
  const buzzwords = [
    'peace of mind',
    'seamless',
    'world-class',
    'premium experience',
    'cutting-edge',
    'state-of-the-art',
    'industry-leading',
    'best-in-class',
    'unparalleled',
    'revolutionary',
    'game-changing',
    'next-level',
  ];
  
  return keywords.filter(keyword => {
    const lower = keyword.toLowerCase();
    return !buzzwords.some(buzz => lower.includes(buzz));
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links: { url: string; priority: number }[] = [];
  const seen = new Set<string>();
  const origin = new URL(baseUrl).origin;
  
  // Step 1: Extract navigation links (highest priority)
  const navRegex = /<nav[^>]*>([\s\S]*?)<\/nav>|<header[^>]*>([\s\S]*?)<\/header>|role=["']navigation["'][^>]*>([\s\S]*?)(?=<\/)/gi;
  let navMatch: RegExpExecArray | null;
  
  while ((navMatch = navRegex.exec(html)) !== null) {
    const navContent = navMatch[0];
    const linkRegex = /href=["']([^"'#]+)["']/gi;
    let linkMatch: RegExpExecArray | null;
    
    while ((linkMatch = linkRegex.exec(navContent)) !== null) {
      try {
        const abs = new URL(linkMatch[1], baseUrl).href;
        if (abs.startsWith(origin) && !seen.has(abs)) {
          const path = new URL(abs).pathname.toLowerCase();
          if (!/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|mp4|webm|ico)$/i.test(path)) {
            seen.add(abs);
            links.push({ url: abs, priority: 100 }); // Top priority
          }
        }
      } catch { /* skip bad URLs */ }
    }
  }
  
  // Step 2: Fill remaining slots with depth-based heuristics
  const allLinkRegex = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  
  while ((m = allLinkRegex.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl).href;
      if (!abs.startsWith(origin) || seen.has(abs)) continue;
      seen.add(abs);
      
      const path = new URL(abs).pathname.toLowerCase();
      if (/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|mp4|webm|ico)$/i.test(path)) continue;
      
      const segments = path.split('/').filter(Boolean);
      const depth = segments.length;
      
      let priority = 0;
      if (/(about|contact|pricing|services|features)/i.test(path)) {
        priority = 80;
      } else if (depth <= 2 && /s$/.test(segments[segments.length - 1])) {
        priority = 60; // Plural nouns (likely categories)
      } else if (depth <= 2) {
        priority = 40;
      }
      
      if (priority > 0) {
        links.push({ url: abs, priority });
      }
    } catch { /* skip bad URLs */ }
  }
  
  // Sort by priority and take top 12
  return links
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 12)
    .map(l => l.url);
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RedditPipe/2.0 (client-detector)" },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html);
  } catch { return ""; }
}

// POST /api/clients/detect — deep-scrape + AI-powered client analysis
app.post("/detect", async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body;
    if (!url) return c.json({ error: "Missing URL" }, 400);

    // ── Step 1: Fetch homepage ──
    const homepageRes = await fetch(url, {
      headers: { "User-Agent": "RedditPipe/2.0 (client-detector)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!homepageRes.ok) return c.json({ error: `Failed to fetch URL: ${homepageRes.status}` }, 400);
    const homepageHtml = await homepageRes.text();

    // Extract meta info
    const titleMatch = homepageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const descMatch = homepageHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || homepageHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const metaDesc = descMatch ? descMatch[1].trim() : "";
    const ogMatch = homepageHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogDesc = ogMatch ? ogMatch[1].trim() : "";

    // ── Step 2: Deep scrape — fetch about/services/product pages ──
    const subLinks = extractInternalLinks(homepageHtml, url);
    const homepageText = stripHtml(homepageHtml).slice(0, 8000);

    // Fetch sub-pages in parallel (max 5)
    const subTexts = await Promise.all(subLinks.map(fetchPageText));
    const deepContent = subTexts.map((t) => t.slice(0, 4000)).join("\n\n");

    // Combine all content for AI analysis (cap at 20000 chars)
    const combinedContent = `HOMEPAGE:\n${homepageText}\n\nSUB-PAGES:\n${deepContent}`.slice(0, 20000);

    // ── Step 3: AI extraction (required for quality) ──
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Without AI, return basic info with a warning — keywords will be poor
      const name = title.split(/[|\-–—]/)[0]?.trim() || "";
      return c.json({
        name,
        description: metaDesc || ogDesc || "",
        keywords: [],
        mentionTerms: [name, new URL(url).hostname.replace("www.", "")].filter(Boolean),
        nuance: null,
        websiteUrl: url,
        warning: "No AI API key configured — add your Anthropic key in Settings for accurate keyword detection",
      });
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const ai = new Anthropic({ apiKey });

    const aiResponse = await Promise.race([
      ai.messages.create({
        model: getValidModel((settings as Record<string, unknown>)?.aiModelDetection as string | undefined),
        max_tokens: 1024,
        system: `You are an expert at understanding businesses and extracting search queries that will discover relevant Reddit discussions.

Your task: Analyze the website content to deeply understand what the company does, who their customers are, and what problems they solve. Then generate search queries that would CAPTURE REDDIT THREADS where users are discussing problems, asking questions, or seeking recommendations related to this business.

CRITICAL: You are generating REDDIT SEARCH QUERIES — the exact phrases people type into Reddit's search bar when they have a need this company addresses. NOT SEO keywords, NOT marketing copy.

Return ONLY a valid JSON object:
{
  "name": "<company or product name — clean brand name only>",
  "description": "<2-3 sentences explaining what the company does, their core offering, and who it's for. Write this as context that would help an AI understand the business when drafting Reddit replies>",
  "keywords": [<array of 15-20 Reddit search queries>],
  "mentionTerms": [<array: brand name, domain, product names people would recognise>],
  "nuance": "<special context for filtering: geographic focus, target market, industries, exclusions, or anything that would help filter irrelevant Reddit threads. null if broadly applicable>"
}

KEYWORD GENERATION STRATEGY:

GOAL: Cast a WIDE NET to capture all relevant threads. These queries will be heuristically filtered and AI-scored later, so prioritize RECALL (capturing relevant threads) over PRECISION (avoiding irrelevant ones).

STEP 1: Identify the PROBLEMS, QUESTIONS, and SITUATIONS where someone would need this product/service.
STEP 2: Extract what people would actually TYPE into Reddit's search bar when they have those problems.
STEP 3: Generate queries across the full spectrum from broad discovery to specific intent.

MENTAL MODEL: What would someone search on Reddit when they:
- Have a problem this business solves?
- Are researching options in this space?
- Are asking for recommendations?
- Are comparing alternatives?
- Are seeking advice or guidance?

GOOD EXAMPLES (for an LLC formation service):
✓ "starting business" (broad discovery)
✓ "how to start LLC" (specific how-to)
✓ "need registered agent" (specific need)
✓ "LLC vs sole proprietorship" (comparison)
✓ "best LLC service" (seeking recommendations)
✓ "forming company" (broad intent)
✓ "business legal structure" (research phase)
✓ "incorporate business" (action-oriented)
✓ "small business setup" (broad discovery)
✓ "registered agent service" (specific solution)

BAD EXAMPLES — avoid these patterns:
✗ "LLC formation services" (SEO keyword, too formal)
✗ "professional registered agent solutions" (marketing jargon)
✗ "business entity compliance management" (corporate speak)
✗ "LLC" (too generic, matches everything)
✗ "affordable LLC formation for entrepreneurs" (too long, too SEO)
✗ "travel insurance peace of mind" (marketing fluff - "peace of mind" isn't searchable)
✗ "seamless travel experience" (advertising copy, not a search query)
✗ "premium luxury packages" (too many adjectives, not natural)
✗ "world-class service" (buzzwords, not searchable)

GENERATE 15-20 KEYWORDS with this MIX:
* 5-6 BROAD (2-3 words): Discovery-phase searches. E.g. "starting business", "need lawyer", "restaurant Manila"
* 6-8 MEDIUM (3-5 words): Natural questions/intents. E.g. "how to start LLC", "best injury lawyer", "where to eat"
* 4-6 SPECIFIC (5-7 words): Long-tail intent queries. E.g. "looking for registered agent service", "need lawyer after car accident"

IMPORTANT PRINCIPLES:
1. Use NATURAL LANGUAGE — how real people type searches, not how marketers write copy
2. Include QUESTION FRAGMENTS — "how to", "where to", "best", "need", "looking for"
3. Mix BROAD + SPECIFIC — cast a wide net, let filtering handle precision
4. Focus on USER INTENT — what are they trying to accomplish or learn?
5. Avoid JARGON — use everyday language, not industry terminology
6. Geographic terms OK if relevant — "Manila", "Philippines", "LA", etc.
7. Extract SPECIFIC OFFERINGS — if the business serves specific locations, destinations, or specialties, include those in keywords
   Example: Travel agency → "Fiji holidays", "Tahiti packages", "Maldives resorts"
   Example: Restaurant → "Italian food [city]", "sushi [neighborhood]"
   Example: Law firm → "personal injury lawyer [city]"

AVOID MARKETING FLUFF:
- Do NOT extract marketing buzzwords: "peace of mind", "seamless", "world-class", "premium experience"
- Focus on CONCRETE NOUNS and ACTIONS: "travel insurance", "holiday packages", "book flights"
- If it sounds like advertising copy, skip it
- Test: Would someone TYPE this into Reddit search? If no, don't use it.

These queries will discover threads where users are actively discussing problems this business can solve. The heuristic filter and AI scoring will handle quality control.`,
        messages: [{
          role: "user",
          content: `Analyze this website and generate Reddit-optimized search terms.\n\nURL: ${url}\nTitle: ${title}\nMeta description: ${metaDesc || ogDesc}\n\n--- WEBSITE CONTENT ---\n${combinedContent}`,
        }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI detection timed out")), 90_000)
      ),
    ]);

    const textBlock = aiResponse.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      const parsed = JSON.parse(jsonStr) as {
        name: string;
        description: string;
        keywords: string[];
        mentionTerms: string[];
        nuance: string | null;
      };
      
      // Filter out marketing fluff from keywords
      const filteredKeywords = filterMarketingFluff(parsed.keywords || []);
      
      return c.json({
        name: parsed.name || title.split(/[|\-–—]/)[0]?.trim() || "",
        description: parsed.description || metaDesc || ogDesc || "",
        keywords: filteredKeywords,
        mentionTerms: parsed.mentionTerms || [],
        nuance: parsed.nuance || null,
        websiteUrl: url,
      });
    }

    return c.json({ error: "AI returned empty response" }, 500);
  } catch (error) {
    console.error("POST /api/clients/detect error:", error);
    return c.json({ error: "Failed to detect client info" }, 500);
  }
});

export default app;
