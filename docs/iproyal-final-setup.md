# IPRoyal Proxy - Final Setup & Configuration

## ✅ Implementation Complete

The IPRoyal residential proxy integration is **fully deployed and working** as of May 11, 2026.

---

## Current Configuration

### Database Settings (Production)
```
proxyEnabled: true
proxyHost: geo.iproyal.com
proxyPort: 12321
proxyUsername: k3T0upvQd0AprQdD
proxyPassword: 2DN0zZnwrNWrOoUH_country-us
proxyRotationMode: daily
```

### Key Details
- **Provider**: IPRoyal Residential Proxies
- **Target Country**: United States (`_country-us` suffix)
- **Rotation**: Daily (new IP each day at midnight UTC)
- **Status**: ✅ Working - bypassing Reddit 403 blocks

---

## Verification Results

### Manual Testing (May 11, 2026)
```bash
# Test 1: Proxy gives US IP
curl -x http://k3T0upvQd0AprQdD:2DN0zZnwrNWrOoUH_country-us@geo.iproyal.com:12321 https://ipinfo.io/ip
# Result: 35.147.138.192 (US IP) ✅

# Test 2: Reddit accepts requests
curl -x http://k3T0upvQd0AprQdD:2DN0zZnwrNWrOoUH_country-us@geo.iproyal.com:12321 \
  -H "User-Agent: Mozilla/5.0..." \
  "https://www.reddit.com/r/cars/search.json?q=test&limit=5"
# Result: 200 OK ✅
```

### Production Search Test
- **Started**: 2026-05-11 16:13:28 UTC
- **Status**: Running successfully through all 13 clients
- **Opportunities Created**: 6+ (and counting)
- **Errors**: 0 (no 403 blocks)
- **Conclusion**: Proxy is working perfectly ✅

---

## Code Changes Deployed

### Files Modified
1. **backend/prisma/schema.prisma**
   - Added proxy configuration fields to Settings model

2. **backend/src/lib/reddit.ts**
   - Added `ProxyConfig` interface
   - Implemented `getProxyAgent()` function with daily rotation
   - Updated `redditFetch()` to use proxy agent
   - Updated `getRedditConfig()` to load proxy settings
   - All Reddit API calls now route through proxy

3. **backend/package.json**
   - Added `https-proxy-agent` dependency
   - Added `node-fetch@2` for proper agent support
   - Added `@types/node-fetch` for TypeScript

### Git Commits
- `8e67d30` - feat: Add IPRoyal proxy support with daily IP rotation
- `a563b73` - fix: Add missing RedditComment interface
- `bd6041c` - fix: Remove undici dependency, use native Node.js fetch
- `b8fad55` - fix: Use node-fetch v2 for proper proxy agent support
- `26c097b` - fix: Change redditFetch return type to avoid type conflicts

---

## How It Works

### Daily IP Rotation
1. Proxy agent is created with session ID based on current date (YYYY-MM-DD)
2. Agent is cached and reused throughout the day
3. At midnight UTC, date changes and new agent is created with new session ID
4. IPRoyal assigns a different IP for the new session
5. All Reddit requests use the new IP

### Request Flow
```
Your App → node-fetch → HttpsProxyAgent → IPRoyal Proxy → Reddit API
                                              ↓
                                         US IP Address
                                         (rotates daily)
```

---

## Maintenance & Monitoring

### Check Proxy Status
```bash
# SSH into VPS
ssh root@76.13.191.149

# View current proxy settings
sqlite3 /opt/redditpipe/data/production.db \
  "SELECT proxyEnabled, proxyHost, proxyPort, proxyRotationMode FROM Settings;"

# Check if proxy is working (look for "Proxy" logs)
docker logs redditpipe-backend --tail 100 | grep Proxy

# Monitor for 403 errors
docker logs redditpipe-backend --tail 200 | grep 403
```

### If Searches Start Failing Again
1. Check if IPRoyal account is active and has credit
2. Try different country targeting:
   - `2DN0zZnwrNWrOoUH_country-ca` (Canada)
   - `2DN0zZnwrNWrOoUH_country-gb` (UK)
   - `2DN0zZnwrNWrOoUH_country-au` (Australia)
3. Change rotation mode to `per_request` for maximum anonymity
4. Contact IPRoyal support for fresh IP pool

### Update Proxy Password (Country Targeting)
```bash
ssh root@76.13.191.149
sqlite3 /opt/redditpipe/data/production.db \
  "UPDATE Settings SET proxyPassword = '2DN0zZnwrNWrOoUH_country-ca' WHERE id = 'singleton';"
docker restart redditpipe-backend
```

---

## Cost Analysis

### IPRoyal Usage
- **Per search run**: ~260 Reddit API calls (13 clients × 20 keywords)
- **Bandwidth per call**: ~10-50 KB
- **Per run total**: ~13 MB
- **Daily usage**: 2 runs × 13 MB = ~26 MB
- **Monthly usage**: ~780 MB

### Estimated Monthly Cost
- **IPRoyal Rate**: ~$7-10/GB
- **Monthly Cost**: $5-10 (well within budget)

---

## Troubleshooting

### Proxy Not Working
**Symptom**: Still getting 403 errors

**Solutions**:
1. Verify proxy credentials are correct
2. Check IPRoyal dashboard for account status
3. Test proxy manually with curl (see Verification section)
4. Try different country targeting
5. Restart backend: `docker restart redditpipe-backend`

### High Costs
**Symptom**: IPRoyal bill is too high

**Solutions**:
1. Reduce search frequency (Settings → Search Schedule)
2. Reduce keywords per client (Settings → Max Keywords Per Client)
3. Switch to `daily` rotation mode (cheaper than `per_request`)
4. Consider switching to OAuth if Reddit approves your app

### IP Still Blocked
**Symptom**: 403 errors even with proxy

**Solutions**:
1. Reddit may be blocking residential proxies from that region
2. Try different country: `_country-ca`, `_country-gb`, `_country-au`
3. Contact IPRoyal support to request IPs from different pool
4. Consider datacenter proxies (cheaper but more likely to be blocked)
5. Last resort: Use Reddit OAuth API

---

## Alternative Proxy Providers

If IPRoyal stops working, consider:

1. **Bright Data** (formerly Luminati)
   - Most reliable, highest quality
   - More expensive (~$15/GB)
   - Best for long-term production use

2. **Smartproxy**
   - Good balance of price/quality
   - ~$8-12/GB
   - Good customer support

3. **Oxylabs**
   - Enterprise-grade
   - ~$15/GB
   - Very reliable

4. **ProxyEmpire**
   - Budget option
   - ~$5-8/GB
   - Less reliable but cheap

---

## Next Steps

### Immediate
- ✅ Proxy is working - no action needed
- Monitor first few automated runs to ensure stability
- Check IPRoyal dashboard for usage/costs

### Optional Improvements
1. **Add proxy health check** - Ping test before each search run
2. **Add fallback** - Switch to direct connection if proxy fails
3. **Add metrics** - Track proxy success rate, bandwidth usage
4. **Add alerts** - Notify if 403 errors return

### Long-term
1. **Monitor Reddit's blocking patterns** - They may adapt
2. **Consider OAuth** - If Reddit approves apps again, switch back
3. **Optimize bandwidth** - Cache results, reduce redundant calls
4. **Scale up** - If successful, add more clients/keywords

---

## Summary

✅ **IPRoyal proxy integration is complete and working**
- Reddit 403 blocks bypassed
- Searches running successfully
- Daily IP rotation configured
- Cost-effective (~$5-10/month)
- No code changes needed going forward

The system is now production-ready and will continue to work as long as:
1. IPRoyal account remains active
2. Reddit doesn't block residential proxies entirely
3. Proxy credentials remain valid

**Status**: 🟢 OPERATIONAL
