# IPRoyal Proxy Setup Guide

## Implementation Complete ✅

I've implemented proxy support with daily IP rotation for IPRoyal. Here's what was added:

### 1. Database Schema Changes
Added proxy configuration fields to Settings:
- `proxyEnabled` (Boolean) - Enable/disable proxy
- `proxyHost` (String) - Proxy server hostname
- `proxyPort` (Int) - Proxy server port
- `proxyUsername` (String) - Proxy authentication username
- `proxyPassword` (String) - Proxy authentication password
- `proxyRotationMode` (String) - "daily", "per_request", or "none"

### 2. Code Changes
- Updated `backend/src/lib/reddit.ts` to support proxy routing
- Added daily IP rotation logic (creates new proxy agent each day)
- All Reddit API calls now route through proxy when enabled

### 3. How It Works
- **Daily Rotation**: Creates a new proxy session ID based on the current date (YYYY-MM-DD)
- **Automatic**: Proxy agent is cached and reused throughout the day
- **Midnight Reset**: New IP is assigned at midnight UTC when the date changes

## Setup Steps

### Step 1: Sign Up for IPRoyal
1. Go to https://iproyal.com/residential-proxies/
2. Sign up for an account
3. Choose a plan (they have free trials available)

### Step 2: Get Your Proxy Credentials
After signing up, you'll receive:
- **Proxy Host**: e.g., `geo.iproyal.com` or `residential.iproyal.com`
- **Proxy Port**: Usually `12321` or `32325`
- **Username**: Your IPRoyal username
- **Password**: Your IPRoyal password

### Step 3: Configure in Production Database
SSH into your VPS and update the settings:

```bash
ssh root@76.13.191.149

sqlite3 /opt/redditpipe/data/production.db

UPDATE Settings SET 
  proxyEnabled = 1,
  proxyHost = 'geo.iproyal.com',
  proxyPort = 12321,
  proxyUsername = 'YOUR_USERNAME',
  proxyPassword = 'YOUR_PASSWORD',
  proxyRotationMode = 'daily'
WHERE id = 'singleton';

.quit
```

### Step 4: Deploy the Changes
The code changes need to be deployed to production:

```bash
# From your local machine
cd /Users/mike/Documents/RedditPipe/reddit-outreach
git add .
git commit -m "feat: Add IPRoyal proxy support with daily IP rotation"
git push origin main
```

### Step 5: Test
After deployment, trigger a manual search and check the logs:

```bash
# Monitor logs for proxy messages
ssh root@76.13.191.149 "docker logs redditpipe-backend --tail 100 --follow"

# Look for:
# [Proxy] Created new proxy agent for 2026-05-11
# [Search] Complete: X threads, Y opportunities...
```

## Rotation Modes

### Daily (Recommended)
- New IP assigned once per day at midnight UTC
- Most cost-effective
- Good balance of anonymity and performance
- **Set**: `proxyRotationMode = 'daily'`

### Per-Request
- New IP for every single Reddit API call
- Maximum anonymity
- Higher cost (more bandwidth usage)
- **Set**: `proxyRotationMode = 'per_request'`

### None
- Same IP for all requests
- Cheapest option
- May still get blocked if IP is flagged
- **Set**: `proxyRotationMode = 'none'`

## Troubleshooting

### If searches still fail with 403:
1. Check proxy credentials are correct
2. Verify IPRoyal account has active subscription
3. Try changing rotation mode to "per_request"
4. Check IPRoyal dashboard for usage/errors

### If proxy connection fails:
1. Verify proxy host and port are correct
2. Check firewall allows outbound connections to proxy
3. Test proxy manually: `curl -x http://username:password@host:port https://ipinfo.io/ip`

### To disable proxy:
```sql
UPDATE Settings SET proxyEnabled = 0 WHERE id = 'singleton';
```

## Cost Estimate

IPRoyal Residential Proxies pricing (approximate):
- **Free Trial**: Usually available
- **Starter**: ~$7/GB
- **Pay-as-you-go**: ~$7-15/GB depending on volume
- **Monthly Plans**: Start around $75/month for 5GB

**Estimated Usage**:
- Each Reddit search: ~10-50KB
- 260 searches per run (20 keywords × 13 clients)
- ~13MB per search run
- 2 runs per day = ~26MB/day = ~780MB/month
- **Cost**: ~$5-10/month at current usage

## Next Steps

1. Sign up for IPRoyal free trial
2. Get your credentials
3. Update production database with credentials
4. Deploy the code changes
5. Test and monitor logs
6. If successful, upgrade to paid plan

Let me know when you have your IPRoyal credentials and I'll help you configure them!
