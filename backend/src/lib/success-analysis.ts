import { createPrismaClient } from "./prisma.js";

/**
 * Get the average deletion time from all deletion analyses
 * Returns hours as float, defaults to 24 hours if no data
 */
export async function getAverageDeletionTime(): Promise<number> {
  const db = createPrismaClient();
  
  try {
    const analyses = await db.deletionAnalysis.findMany({
      select: { hoursUntilDeletion: true },
    });

    if (analyses.length === 0) {
      console.log("[Success Analysis] No deletion data found, using default 24 hours");
      return 24;
    }

    const total = analyses.reduce((sum, a) => sum + a.hoursUntilDeletion, 0);
    const average = total / analyses.length;
    
    console.log(`[Success Analysis] Average deletion time: ${average.toFixed(1)} hours (from ${analyses.length} deletions)`);
    return average;
  } finally {
    await db.$disconnect();
  }
}

/**
 * Get published opportunities that have aged past the average deletion time
 * and haven't been analyzed yet
 */
export async function getEligibleSuccessOpportunities(limit: number = 50) {
  const db = createPrismaClient();
  
  try {
    const avgDeletionTime = await getAverageDeletionTime();
    const cutoffDate = new Date(Date.now() - avgDeletionTime * 60 * 60 * 1000);

    const opportunities = await db.opportunity.findMany({
      where: {
        status: "published",
        publishedAt: {
          lte: cutoffDate,
        },
        successAnalysis: null,
        deletedAt: null, // Not deleted
      },
      include: {
        client: true,
        account: true,
      },
      orderBy: {
        publishedAt: "asc", // Oldest first
      },
      take: limit,
    });

    console.log(`[Success Analysis] Found ${opportunities.length} eligible opportunities (published before ${cutoffDate.toISOString()})`);
    return opportunities;
  } finally {
    await db.$disconnect();
  }
}
