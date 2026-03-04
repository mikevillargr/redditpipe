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
  const links: string[] = [];
  const seen = new Set<string>();
  const regex = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  const origin = new URL(baseUrl).origin;
  while ((m = regex.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl).href;
      if (!abs.startsWith(origin)) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      // Prioritise about / services / features / pricing / product pages
      const path = new URL(abs).pathname.toLowerCase();
      if (/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|mp4|webm|ico)$/i.test(path)) continue;
      if (/(about|services|features|pricing|product|solution|how-it-works|why|industries|use-case)/i.test(path)) {
        links.unshift(abs); // high priority first
      } else if (path !== "/" && path.split("/").length <= 3) {
        links.push(abs);
      }
    } catch { /* skip bad URLs */ }
  }
  return links.slice(0, 5); // max 5 sub-pages
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
    const homepageText = stripHtml(homepageHtml).slice(0, 4000);

    // Fetch sub-pages in parallel (max 5)
    const subTexts = await Promise.all(subLinks.map(fetchPageText));
    const deepContent = subTexts.map((t) => t.slice(0, 2000)).join("\n\n");

    // Combine all content for AI analysis (cap at 8000 chars)
    const combinedContent = `HOMEPAGE:\n${homepageText}\n\nSUB-PAGES:\n${deepContent}`.slice(0, 8000);

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
        system: `You are an expert at understanding businesses and finding relevant Reddit discussions where those businesses could be mentioned.

Given website content, deeply understand what the company does, who their customers are, and what problems they solve. Then generate search queries that would FIND REDDIT THREADS where this company's product/service would be relevant as a recommendation.

CRITICAL DISTINCTION: You are NOT generating SEO keywords or marketing terms. You are generating REDDIT SEARCH QUERIES — the exact phrases someone would type into Reddit's search bar when they have a problem this company can solve.

Return ONLY a valid JSON object:
{
  "name": "<company or product name — clean brand name only>",
  "description": "<2-3 sentences explaining what the company does, their core offering, and who it's for. Write this as context that would help an AI understand the business when drafting Reddit replies>",
  "keywords": [<array of 8-12 Reddit search queries>],
  "mentionTerms": [<array: brand name, domain, product names people would recognise>],
  "nuance": "<special context for filtering: geographic focus, target market, industries, exclusions, or anything that would help filter irrelevant Reddit threads. null if broadly applicable>"
}

KEYWORD GUIDELINES — this is the most critical part:

STEP 1: Identify the PROBLEMS and SITUATIONS where someone would need this product/service.
STEP 2: Think about what a frustrated/curious Reddit user would actually SEARCH FOR when experiencing those problems.
STEP 3: Write those searches as keywords.

The mental model: A person sits down at Reddit, has a problem, and types a search. What do they type?

GOOD keyword examples (for an LLC formation service):
- "how to start an LLC" (someone figuring out the process)
- "best LLC service" (someone looking for a provider)
- "recommend LLC formation" (asking for recommendations)
- "LLC vs sole proprietorship" (comparing options)
- "need registered agent" (specific need)
- "starting a business" (broad discovery)
- "small business legal structure" (researching)

BAD keyword examples — DO NOT generate these:
- "LLC formation services" (SEO keyword, not how people search Reddit)
- "professional registered agent solutions" (marketing speak)
- "business entity compliance management" (jargon, nobody searches this)
- "affordable LLC formation for entrepreneurs" (too long and too SEO)
- "LLC" (too generic, matches everything)

Generate a MIX:
* 4-5 SHORT (2-3 words): broad problem/topic terms. E.g. "starting business", "need accountant"
* 4-5 MEDIUM (3-4 words): natural question fragments. E.g. "best LLC service", "how to incorporate"
* 2-3 LONG (4-6 words): specific intent queries. E.g. "how to start an LLC", "looking for registered agent"

Focus on DISCOVERY — these queries should find threads where the company could naturally be recommended, not threads already about the company.`,
        messages: [{
          role: "user",
          content: `Analyze this website and generate Reddit-optimized search terms.\n\nURL: ${url}\nTitle: ${title}\nMeta description: ${metaDesc || ogDesc}\n\n--- WEBSITE CONTENT ---\n${combinedContent}`,
        }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI detection timed out")), 30_000)
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
      return c.json({
        name: parsed.name || title.split(/[|\-–—]/)[0]?.trim() || "",
        description: parsed.description || metaDesc || ogDesc || "",
        keywords: parsed.keywords || [],
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
