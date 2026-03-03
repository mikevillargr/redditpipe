import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Fetch the page content
    let pageText = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RedditPipe/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL (HTTP ${res.status})` },
          { status: 400 }
        );
      }

      const html = await res.text();
      // Strip HTML tags and extract text content
      pageText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000); // Limit to 5k chars for AI
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Could not reach URL: ${fetchErr instanceof Error ? fetchErr.message : "Network error"}` },
        { status: 400 }
      );
    }

    // Get API key
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });
    const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `You analyze websites and extract structured information for a Reddit outreach tool. Given a website's text content, determine what the business does and generate useful metadata.

Respond with ONLY a JSON object:
{
  "name": "<business/brand name>",
  "description": "<2-3 sentence description of what the business does, its target audience, and core value proposition>",
  "keywords": ["<keyword1>", "<keyword2>", ...],
  "mentionTerms": ["<brand name>", "<website domain>", "<product name>"]
}

RULES for keywords:
- Generate 8-15 search keywords that people on Reddit would use when looking for this type of service/product
- Include both broad terms and specific long-tail phrases
- Focus on problem/solution language (e.g. "need help with X", "looking for Y", "best Z")
- Include the industry/niche terms

RULES for mentionTerms:
- Include the brand name, website URL (without https://), and any product names
- These are what the AI will naturally weave into Reddit replies`,
      messages: [
        {
          role: "user",
          content: `Analyze this website and extract business information:\n\nURL: ${normalizedUrl}\n\nPage content:\n${pageText}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "AI returned no response" },
        { status: 500 }
      );
    }

    // Parse JSON, stripping code fences if present
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(jsonStr) as {
      name: string;
      description: string;
      keywords: string[];
      mentionTerms: string[];
    };

    return NextResponse.json({
      name: parsed.name || "",
      description: parsed.description || "",
      keywords: parsed.keywords || [],
      mentionTerms: parsed.mentionTerms || [],
      url: normalizedUrl,
    });
  } catch (error) {
    console.error("POST /api/clients/detect error:", error);
    return NextResponse.json(
      {
        error: "Detection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
