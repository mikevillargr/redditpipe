import { prisma } from './dist/lib/prisma.js'

async function seedInsightsData() {
  console.log('🌱 Seeding insights data...')

  // Get or create a test client
  let client = await prisma.client.findFirst()
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'Test Client',
        websiteUrl: 'https://example.com',
        description: 'Test client for insights',
        keywords: 'software, technology, development',
        status: 'active',
      },
    })
    console.log('✓ Created test client')
  }

  // Get or create a test account
  let account = await prisma.redditAccount.findFirst()
  if (!account) {
    account = await prisma.redditAccount.create({
      data: {
        username: 'test_account',
        password: 'test_password',
        status: 'active',
        postKarma: 1500,
        commentKarma: 3200,
      },
    })
    console.log('✓ Created test account')
  }

  // Create some dismissal logs
  const dismissalReasons = [
    { reason: 'Off-topic - discussing gaming instead of software development', subreddit: 'programming' },
    { reason: 'Too promotional - directly advertising product', subreddit: 'webdev' },
    { reason: 'Low engagement - thread has only 2 comments', subreddit: 'technology' },
    { reason: 'Off-topic - about hardware not software', subreddit: 'programming' },
    { reason: 'Too promotional - link in every comment', subreddit: 'coding' },
  ]

  for (const { reason, subreddit } of dismissalReasons) {
    await prisma.dismissalLog.create({
      data: {
        clientId: client.id,
        clientName: client.name,
        threadId: `t3_${Math.random().toString(36).substr(2, 9)}`,
        subreddit,
        title: `Sample thread about ${subreddit}`,
        relevanceScore: Math.random() * 0.5,
        reason,
      },
    })
  }
  console.log('✓ Created 5 dismissal logs')

  // Create opportunities for deletion and success analysis
  const opportunities = []
  for (let i = 0; i < 5; i++) {
    const opp = await prisma.opportunity.create({
      data: {
        clientId: client.id,
        accountId: account.id,
        threadId: `t3_${Math.random().toString(36).substr(2, 9)}`,
        threadUrl: `https://reddit.com/r/test/comments/${Math.random().toString(36).substr(2, 9)}`,
        subreddit: ['programming', 'webdev', 'technology', 'coding', 'javascript'][i],
        title: `Test thread ${i + 1}`,
        bodySnippet: 'Test body snippet',
        relevanceScore: 0.7 + Math.random() * 0.2,
        status: i < 3 ? 'published' : 'deleted_by_mod',
        publishedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        deletedAt: i < 3 ? null : new Date(Date.now() - i * 12 * 60 * 60 * 1000),
      },
    })
    opportunities.push(opp)
  }
  console.log('✓ Created 5 opportunities')

  // Create deletion analyses for deleted opportunities
  const deletionReasons = ['spam', 'self-promotion', 'off-topic']
  for (let i = 0; i < 2; i++) {
    const opp = opportunities[3 + i]
    await prisma.deletionAnalysis.create({
      data: {
        opportunityId: opp.id,
        subreddit: opp.subreddit,
        commentText: 'This is a test comment that was deleted',
        threadTitle: opp.title,
        threadContext: 'Thread was about software development',
        citationIncluded: true,
        citationUrl: 'https://example.com',
        publishedAt: opp.publishedAt,
        deletedAt: opp.deletedAt,
        hoursUntilDeletion: 12 + i * 6,
        aiAnalysis: `The comment was likely deleted because it appeared too promotional. The moderators may have flagged it as ${deletionReasons[i]}.`,
        likelyReason: deletionReasons[i],
        confidence: 0.75 + Math.random() * 0.2,
        patterns: JSON.stringify(['Direct product mention', 'External link in first sentence']),
        recommendations: JSON.stringify([
          'Avoid mentioning product name in opening',
          'Build context before sharing links',
          'Focus on solving the problem first',
        ]),
      },
    })
  }
  console.log('✓ Created 2 deletion analyses')

  // Create success analyses for published opportunities
  const successFactors = [
    'Natural conversation flow',
    'Helpful context provided',
    'Relevant to discussion',
    'No hard sell',
  ]
  for (let i = 0; i < 3; i++) {
    const opp = opportunities[i]
    await prisma.successAnalysis.create({
      data: {
        opportunityId: opp.id,
        subreddit: opp.subreddit,
        commentText: 'This is a test comment that succeeded',
        threadTitle: opp.title,
        threadContext: 'Thread was about best practices',
        citationIncluded: true,
        citationUrl: 'https://example.com',
        publishedAt: opp.publishedAt,
        analyzedAt: new Date(),
        ageAtAnalysis: 24 + i * 12,
        aiAnalysis: `This comment succeeded because it provided genuine value to the discussion. Key factors: ${successFactors.slice(0, 2 + i).join(', ')}.`,
        successFactors: JSON.stringify(successFactors.slice(0, 2 + i)),
        recommendations: JSON.stringify({
          filtering: [
            { text: 'Prioritize threads with genuine questions', frequency: 3 },
            { text: 'Look for discussions where expertise adds value', frequency: 2 },
          ],
          generation: [
            { text: 'Start with acknowledging the question', frequency: 3 },
            { text: 'Provide actionable advice before mentioning tools', frequency: 2 },
          ],
        }),
        confidence: 0.8 + Math.random() * 0.15,
      },
    })
  }
  console.log('✓ Created 3 success analyses')

  console.log('✅ Insights data seeding complete!')
}

seedInsightsData()
  .catch((e) => {
    console.error('❌ Error seeding insights data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
