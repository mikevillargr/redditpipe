// Quick script to test deletion detection logic
import { checkCommentExists } from './src/lib/deletion-detection.js';

const testCases = [
  {
    url: 'https://www.reddit.com/r/legaladvice/comments/1rsxlnx/comment/oac3rno/',
    author: 'LongjumpingSurvey260',
    title: 'motorcycle crash advice'
  },
  {
    url: 'https://www.reddit.com/r/smallbusiness/comments/1rs631h/comment/oa53xpy/',
    author: 'Other_Leek_4728',
    title: 'When is the right time to open an LLC?'
  },
  {
    url: 'https://www.reddit.com/r/personalfinance/comments/1rs3v5p/can_i_claim_business_mileage_on_my_2025_taxes_for/oa589nd/',
    author: 'Puzzleheaded_Foot345',
    title: 'Can I claim business mileage'
  },
  {
    url: 'https://www.reddit.com/r/Insurance/comments/1rrygms/do_i_need_a_lawyer_is_it_even_worth_it/oa523gw/',
    author: 'Beneficial_Let5531',
    title: 'Do I need a lawyer?'
  }
];

async function runTests() {
  for (const test of testCases) {
    console.log(`\n=== Testing: ${test.title} ===`);
    console.log(`URL: ${test.url}`);
    console.log(`Expected Author: ${test.author}`);
    
    const exists = await checkCommentExists(test.url, test.author);
    console.log(`Result: ${exists ? 'EXISTS ✓' : 'DELETED/MISSING ✗'}`);
    
    // Wait 3 seconds between checks to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

runTests().catch(console.error);
