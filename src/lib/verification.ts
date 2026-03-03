import { verifyCommentOnThread } from "./reddit";
import { prisma } from "./prisma";

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

    return {
      verified: result.found,
      permalinkUrl: result.permalink,
    };
  } catch (error) {
    console.error("Auto-verification failed:", error);
    return { verified: false };
  }
}

export async function manualVerifyComment(
  permalinkUrl: string
): Promise<VerifyResult> {
  // Validate URL looks like a Reddit comment permalink
  const redditCommentPattern =
    /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\/[^/]+\/.+\/[^/]+\/?/;

  if (!redditCommentPattern.test(permalinkUrl)) {
    throw new Error(
      "Invalid Reddit comment permalink. Expected format: https://www.reddit.com/r/subreddit/comments/threadId/title/commentId/"
    );
  }

  return {
    verified: true,
    permalinkUrl,
  };
}

export async function markAsPublished(
  opportunityId: string
): Promise<{ status: string; permalinkUrl?: string }> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { account: true },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  if (!opportunity.account) {
    throw new Error("No account assigned to this opportunity");
  }

  const result = await autoVerifyComment(
    opportunity.account.username,
    opportunity.threadId
  );

  if (result.verified) {
    await prisma.$transaction([
      prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          status: "published",
          permalinkUrl: result.permalinkUrl,
        },
      }),
      prisma.redditAccount.update({
        where: { id: opportunity.account.id },
        data: {
          citationPostsWeek: { increment: 1 },
          postsTodayCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      }),
    ]);

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

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  const updates: Promise<unknown>[] = [
    prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        status: "published",
        permalinkUrl: result.permalinkUrl,
      },
    }),
  ];

  if (opportunity.account) {
    updates.push(
      prisma.redditAccount.update({
        where: { id: opportunity.account.id },
        data: {
          citationPostsWeek: { increment: 1 },
          postsTodayCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      })
    );
  }

  await Promise.all(updates);

  return { status: "published", permalinkUrl: result.permalinkUrl! };
}
