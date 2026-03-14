import { createPrismaClient } from "../lib/prisma.js";
import { getUserComments } from "../lib/reddit.js";

/**
 * Migration script to fix incorrect permalinks in the database
 * Replaces account comment history URLs with actual comment permalinks
 */
async function fixPermalinks() {
  const db = createPrismaClient();
  
  try {
    // Find all published opportunities with permalinks
    const opportunities = await db.opportunity.findMany({
      where: {
        status: "published",
        permalinkUrl: { not: null },
      },
      include: {
        account: true,
      },
    });

    console.log(`Found ${opportunities.length} published opportunities with permalinks`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const opp of opportunities) {
      // Check if permalink is incorrect (account comment history URL)
      if (
        opp.permalinkUrl &&
        opp.permalinkUrl.includes("/user/") &&
        opp.permalinkUrl.includes("/comments/") &&
        (opp.permalinkUrl.endsWith("/comments/") || 
         opp.permalinkUrl.split("/").length === 6)
      ) {
        console.log(`\nFixing opportunity ${opp.id}`);
        console.log(`  Current URL: ${opp.permalinkUrl}`);
        
        if (!opp.account) {
          console.log(`  ⚠️  No account assigned, skipping`);
          skipped++;
          continue;
        }

        try {
          // Fetch user's recent comments
          const comments = await getUserComments(opp.account.username, 50);
          
          // Find the comment for this thread
          const match = comments.find((c) => c.link_id === `t3_${opp.threadId}`);
          
          if (match) {
            const correctPermalink = `https://www.reddit.com${match.permalink}`;
            
            // Update the opportunity
            await db.opportunity.update({
              where: { id: opp.id },
              data: { permalinkUrl: correctPermalink },
            });
            
            console.log(`  ✓ Fixed: ${correctPermalink}`);
            fixed++;
          } else {
            console.log(`  ⚠️  Comment not found in user's recent history, skipping`);
            skipped++;
          }
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
          errors++;
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${opportunities.length}`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

fixPermalinks()
  .then(() => {
    console.log("\n✓ Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  });
