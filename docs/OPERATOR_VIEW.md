# Operator View - Role-Based Access Control

RedditPipe supports two user roles with different permission levels:

## Roles

### Admin
- **Full access** to all features
- Can access Settings page
- Can trigger manual searches via "Run Search" button
- Can modify all configurations

### Operator
- **Read-only access** to operational features
- **Full access to:**
  - Dashboard (view and manage opportunities)
  - Clients (view client configurations)
  - Accounts (view and manage Reddit accounts)
  - Insights (view analytics and recommendations)
  - Reports (view performance reports)
  - Karma Farming (manage account warming)

- **Cannot access:**
  - Settings page (hidden from sidebar)
  - "Run Search" button (hidden from Dashboard)
  - Any configuration changes

## Authentication

### Environment Variables

Set these in your `.env.production` file:

```bash
# Admin credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-admin-password

# Operator credentials
OPS_USERNAME=operator
OPS_PASSWORD=operator
```

### Default Credentials

**Operator Login:**
- Username: `operator`
- Password: `operator`

**Admin Login:**
- Username: `admin`
- Password: Set via `AUTH_PASSWORD` environment variable

## Implementation Details

### Backend (`backend/src/routes/auth.ts`)
- Login endpoint checks both admin and operator credentials
- Returns role (`admin` or `operator`) in login response
- Session stores role for subsequent requests

### Frontend

**App.tsx:**
- Stores `userRole` state from auth check
- Passes role to Dashboard and Sidebar components
- Redirects operators from Settings to Dashboard

**Sidebar.tsx:**
- Conditionally renders Settings menu item (admin only)
- Shows all other navigation items to both roles

**Dashboard.tsx:**
- Accepts `userRole` prop
- Conditionally renders "Run Search" button (admin only)
- All other features available to both roles

## Use Cases

### Operator Role Use Cases
- **Client team members** who need to manage opportunities but shouldn't modify system settings
- **Content writers** who draft and publish replies
- **Account managers** who monitor Reddit account health
- **Analysts** who review insights and reports

### Admin Role Use Cases
- **System administrators** who configure search settings
- **Technical team** who manage integrations and API keys
- **Decision makers** who control search schedules and AI models

## Security Notes

1. **Change default operator password** in production
2. Operator credentials are checked via environment variables
3. Role is stored in server-side session, not client-side
4. Frontend UI restrictions are backed by session-based role checks

## Testing

### Test Operator Access
1. Log in with `operator` / `operator`
2. Verify Settings is hidden from sidebar
3. Verify "Run Search" button is hidden on Dashboard
4. Verify all other features work normally

### Test Admin Access
1. Log in with admin credentials
2. Verify Settings is visible in sidebar
3. Verify "Run Search" button is visible on Dashboard
4. Verify all features work normally

## Future Enhancements

Potential improvements for role-based access:
- Additional roles (viewer, editor, etc.)
- Granular permissions per feature
- User management UI
- Audit logging for operator actions
- Multi-user support with database-backed users
