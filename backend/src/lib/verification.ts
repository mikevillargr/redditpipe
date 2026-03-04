import { verifyCommentOnThread } from "./reddit.js";
import { prisma } from "./prisma.js";

interface VerifyResult {
  verified: boolean;
  permalinkUrl?: string;
}

export async function autoVerifyComment(
  accountUsername: string,
  threadId: string
): Promise<VerifyResult> {
  try {
    const result = await verifyCommentOnThread(accountUsername, threadId);
    return { verified: result.found, permalinkUrl: result.permalink };
  } catch (error) {
    console.error("Auto-verification failed:", error);
    return { verified: false };
  }
}

export async function manualVerifyComment(permalinkUrl: string): Promise<VerifyResult> {
  const redditCommentPattern =
    /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\/[^/]+\/.+\/[^/]+\/?/;
  if (!redditCommentPattern.test(permalinkUrl)) {
    throw new Error("Invalid Reddit comment permalink.");
  }
  return { verified: true, permalinkUrl };
}

export async function markAsPublished(
  opportunityId: string
): Promise<{ status: string; permalinkUrl?: string }> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { account: true },
  });
  if (!opportunity) throw new Error("Opportunity not found");
  if (!opportunity.account) throw new Error("No account assigned to this opportunity");

  const result = await autoVerifyComment(opportunity.account.username, opportunity.threadId);

  if (result.verified) {
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { status: "published", permalinkUrl: result.permalinkUrl },
    });
    await prisma.redditAccount.update({
      where: { id: opportunity.account.id },
      data: {
        citationPostsWeek: { increment: 1 },
        postsTodayCount: { increment: 1 },
        lastPostAt: new Date(),
      },
    });
    return { status: "published", permalinkUrl: result.permalinkUrl };
  } else {
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { status: "unverified" },
    });
    return { status: "unverified" };
  }
}

export async function submitPermalink(
  opportunityId: string,
  permalinkUrl: string
): Promise<{ status: string; permalinkUrl: string }> {
  const result = await manualVerifyComment(permalinkUrl);
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { account: true },
  });
  if (!opportunity) throw new Error("Opportunity not found");

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { status: "published", permalinkUrl: result.permalinkUrl },
  });

  if (opportunity.account) {
    await prisma.redditAccount.update({
      where: { id: opportunity.account.id },
      data: {
        citationPostsWeek: { increment: 1 },
        postsTodayCount: { increment: 1 },
        lastPostAt: new Date(),
      },
    });
  }

  return { status: "published", permalinkUrl: result.permalinkUrl! };
}
