import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";

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
    const { name, websiteUrl, description, keywords, mentionTerms, status } = body;

    if (!name || !websiteUrl || !description || !keywords) {
      return c.json({ error: "Missing required fields: name, websiteUrl, description, keywords" }, 400);
    }

    const client = await prisma.client.create({
      data: { name, websiteUrl, description, keywords, mentionTerms: mentionTerms || null, status: status || "active" },
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

// POST /api/clients/detect — auto-detect keywords from URL
app.post("/detect", async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body;
    if (!url) return c.json({ error: "Missing URL" }, 400);

    // Fetch the page and extract meta info
    const response = await fetch(url, {
      headers: { "User-Agent": "RedditPipe/2.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return c.json({ error: `Failed to fetch URL: ${response.status}` }, 400);

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract OG description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : "";

    return c.json({
      name: title.split(/[|\-–—]/)[0]?.trim() || "",
      description: description || ogDescription || "",
      websiteUrl: url,
    });
  } catch (error) {
    console.error("POST /api/clients/detect error:", error);
    return c.json({ error: "Failed to detect client info" }, 500);
  }
});

export default app;
