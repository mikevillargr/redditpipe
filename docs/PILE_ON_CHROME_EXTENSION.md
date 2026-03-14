# Pile-On Opportunities - Chrome Extension Integration

## Overview
Pile-on opportunities are now fully integrated as regular `Opportunity` records with `opportunityType='pile_on'`. They work identically to primary opportunities and are automatically exposed through existing APIs.

## API Exposure

### GET /api/opportunities
**Already Exposed** ✓

Pile-on opportunities are automatically included in the standard opportunities endpoint. They can be identified by:
- `opportunityType: 'pile_on'`
- `parentOpportunityId: <parent-opportunity-id>`
- `discoveredVia: 'pile_on'`

**Example Response:**
```json
{
  "id": "clx123...",
  "clientId": "clx456...",
  "accountId": "clx789...",
  "threadId": "t3_abc123",
  "threadUrl": "https://reddit.com/r/...",
  "subreddit": "personalfinance",
  "title": "Need advice on medical bills",
  "aiDraftReply": "I agree, a GoFundMe is absolutely reasonable...",
  "status": "new",
  "opportunityType": "pile_on",
  "parentOpportunityId": "clx999...",
  "discoveredVia": "pile_on",
  "createdAt": "2026-03-14T...",
  ...
}
```

### Filtering Pile-On Opportunities

**By Account:**
```
GET /api/opportunities?accountId=<account-id>
```
Returns all opportunities (including pile-ons) assigned to that account.

**By Status:**
```
GET /api/opportunities?status=new
GET /api/opportunities?status=published
```
Pile-on opportunities follow the same status flow as primary opportunities.

**By Parent Opportunity:**
```
GET /api/opportunities?threadId=<thread-id>
```
Returns both the parent opportunity and any pile-on opportunities for the same thread.

## Chrome Extension Use Cases

### 1. Display Pile-On Opportunities
The extension can show pile-on opportunities in the user's queue just like primary opportunities. They should be visually distinguished (e.g., with a "PILE-ON" badge).

### 2. Quick Actions
- **Copy Draft**: Copy `aiDraftReply` to clipboard
- **Go to Thread**: Open `threadUrl` in new tab
- **Mark as Published**: Update status to "published" with permalink

### 3. Account Assignment
Pile-on opportunities are pre-assigned to a specific Reddit account during creation, so the extension knows which account credentials to use.

## Workflow in Extension

1. **Fetch opportunities** for logged-in account
2. **Filter pile-ons** by checking `opportunityType === 'pile_on'`
3. **Display with badge** to distinguish from primary opportunities
4. **Show parent context** (optional): Fetch parent opportunity using `parentOpportunityId`
5. **Enable quick reply**: User can copy draft and navigate to thread
6. **Mark as published**: After posting, submit permalink via existing API

## No Additional API Changes Needed

All existing opportunity endpoints work with pile-on opportunities:
- ✓ `GET /api/opportunities` - List all
- ✓ `GET /api/opportunities/:id` - Get single
- ✓ `POST /api/opportunities/:id/assign` - Assign account
- ✓ `POST /api/opportunities/:id/manual-verify` - Mark as published
- ✓ `POST /api/opportunities/:id/rewrite` - Regenerate draft
- ✓ `DELETE /api/opportunities/:id` - Delete

## Implementation Notes

### Backend Changes (Completed)
- Pile-on generation now creates `Opportunity` records instead of `PileOnComment`
- `opportunityType` field distinguishes pile-ons from primary opportunities
- `parentOpportunityId` links pile-on to original opportunity
- Account interactions are logged when pile-on is published

### Frontend Changes (Completed)
- `PileOnDialog` updated to work with new Opportunity-based system
- Added "Go to Comment Thread" button for easy navigation
- Pile-on opportunities appear in assigned account's opportunity list
- Visual distinction with "PILE-ON" badge

### Database Schema
No schema changes needed - existing `Opportunity` model supports pile-ons via:
- `opportunityType` (default: "primary", can be "pile_on")
- `parentOpportunityId` (nullable, references parent opportunity)
- All other fields work identically to primary opportunities
