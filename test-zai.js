const jwt = require('jsonwebtoken');

// Test Z.ai JWT token generation
const apiKey = process.argv[2] || '72fdd31c0e83450290ec2c61505c72ce.NRV7vRRRzmOANSBt';

try {
  const [id, secret] = apiKey.split('.');
  if (!id || !secret) {
    console.error('Invalid API key format. Expected: id.secret');
    process.exit(1);
  }

  const nowMs = Date.now();
  const payload = {
    api_key: id,
    exp: nowMs + 3600000,
    timestamp: nowMs
  };

  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    header: { alg: 'HS256', sign_type: 'SIGN' }
  });

  console.log('API Key ID:', id);
  console.log('Token:', token);
  console.log('\nTest with:');
  console.log('curl -X POST https://api.z.ai/api/paas/v4/chat/completions \\');
  console.log('  -H "Authorization: Bearer ' + token + '" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"model":"glm-4.5","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}\'');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
