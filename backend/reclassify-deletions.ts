// Script to reclassify false positive deletions
// Checks all opportunities marked as deleted_by_mod and verifies if they're actually deleted
// If comment still exists, reclassifies back to published status

import { createPrismaClient } from './src/lib/prisma.js';
import { checkCommentExists } from './src/lib/deletion-detection.js';

async function reclassifyDeletions() {
  const prisma = createPrismaClient();
  
  try {
    console.log('[Reclassify] Starting reclassification of deleted opportunities...\n');
    
    // Get all opportunities marked as deleted_by_mod
    const deletedOpportunities = await prisma.opportunity.findMany({
      where: {
        status: 'deleted_by_mod',
        permalinkUrl: { not: null },
      },
      include: {
        account: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });
    
    console.log(`[Reclassify] Found ${deletedOpportunities.length} opportunities marked as deleted\n`);
    
    let checked = 0;
    let reclassified = 0;
    let actuallyDeleted = 0;
    let errors = 0;
    
    for (const opp of deletedOpportunities) {
      checked++;
      
      if (!opp.permalinkUrl || !opp.account?.username) {
        console.log(`[${checked}/${deletedOpportunities.length}] Skipping ${opp.id} - missing permalink or account`);
        continue;
      }
      
      console.log(`[${checked}/${deletedOpportunities.length}] Checking: ${opp.title.substring(0, 50)}...`);
      console.log(`  Account: ${opp.account.username}`);
      console.log(`  Permalink: ${opp.permalinkUrl}`);
      
      try {
        // Check if comment actually exists
        const exists = await checkCommentExists(opp.permalinkUrl, opp.account.username);
        
        if (exists) {
          // Comment still exists - this was a false positive!
          console.log(`  ✓ COMMENT EXISTS - Reclassifying to published`);
          
          await prisma.opportunity.update({
            where: { id: opp.id },
            data: {
              status: 'published',
              deletedAt: null,
            },
          });
          
          reclassified++;
        } else {
          // Comment is actually deleted
          console.log(`  ✗ Comment confirmed deleted`);
          actuallyDeleted++;
        }
      } catch (error) {
        console.error(`  ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errors++;
      }
      
      // Wait 3 seconds between checks to avoid rate limiting
      if (checked < deletedOpportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n=== Reclassification Complete ===');
    console.log(`Total checked: ${checked}`);
    console.log(`Reclassified to published: ${reclassified}`);
    console.log(`Confirmed deleted: ${actuallyDeleted}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('[Reclassify] Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

reclassifyDeletions().catch(console.error);
