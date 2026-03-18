#!/bin/bash
# Direct test of Z.ai API with your key

API_KEY="72fdd31c0e83450290ec2c61505c72ce.NRV7vRRRzmOANSBt"

# Generate JWT token using Node.js
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const apiKey = '$API_KEY';
const [id, secret] = apiKey.split('.');
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
console.log(token);
")

echo "Generated Token: ${TOKEN:0:50}..."
echo ""
echo "Testing Z.ai API..."
echo ""

# Test the API
curl -X POST https://api.z.ai/api/paas/v4/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.5","messages":[{"role":"user","content":"Say hello in one word"}],"max_tokens":50}' \
  2>&1

echo ""
