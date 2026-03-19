# API Endpoints Test Checklist

## Clients Modal Features

### Auto Detect
**Endpoint:** `POST /api/clients/detect`  
**Request Body:**
```json
{
  "url": "https://example.com"
}
```
**Expected Response:**
```json
{
  "name": "Company Name",
  "description": "Auto-generated description",
  "keywords": ["keyword1", "keyword2", ...],
  "mentionTerms": ["term1", "term2", ...],
  "nuance": "Auto-generated nuance"
}
```
**Status:** ✅ Backend endpoint exists at `backend/src/routes/clients.ts`

### CSV Upload
**Implementation:** Client-side only (FileReader API)  
**Status:** ✅ No backend needed

### Keyword Modes
**Implementation:** Client-side only (string parsing)  
**Status:** ✅ No backend needed

## Accounts Modal Features

### Verify Credentials
**Endpoint:** `POST /api/accounts/verify`  
**Request Body:**
```json
{
  "username": "reddit_username",
  "password": "reddit_password"
}
```
**Expected Response:**
```json
{
  "valid": true
}
```
or
```json
{
  "valid": false,
  "error": "Error message"
}
```
**Status:** ✅ Backend endpoint exists at `backend/src/routes/accounts.ts`

### Randomize Persona
**Endpoint:** `POST /api/accounts/generate-persona`  
**Request Body:**
```json
{
  "username": "reddit_username"
}
```
**Expected Response:**
```json
{
  "personaNotes": "AI-generated persona description"
}
```
**Status:** ✅ Endpoint IMPLEMENTED and ready to test

### Max Posts Per Day & Initial Status
**Implementation:** Saved with account creation/update  
**Endpoint:** `POST /api/accounts` or `PUT /api/accounts/:id`  
**Status:** ✅ Standard CRUD operations

## Testing Steps

1. **Test Auto Detect:**
   - Navigate to Clients page
   - Click "Add Client"
   - Enter a website URL
   - Click "Auto Detect" button
   - Verify fields populate with AI-generated data

2. **Test Keyword Modes:**
   - Toggle between "Comma-separated", "One per line", and "CSV upload"
   - Verify textarea placeholder changes
   - Upload a CSV file and verify keywords load

3. **Test Verify Credentials:**
   - Navigate to Accounts page
   - Click "Add Account"
   - Enter Reddit username and password
   - Click "Verify Credentials"
   - Verify success/error message appears

4. **Test Randomize Persona:**
   - In Add Account modal
   - Enter a username
   - Click "Randomize" button
   - Verify Persona Notes field populates

5. **Test Form Submission:**
   - Fill out all fields in both modals
   - Submit forms
   - Verify data saves correctly
   - Verify data appears in tables

## Known Issues

- None currently identified

## Browser Console Checks

When testing, monitor browser console for:
- Network errors (404, 500, etc.)
- CORS issues
- JavaScript errors
- API response validation

## Next Steps

1. Start dev server: `npm run dev` in frontend directory
2. Navigate to http://localhost:5173
3. Test each feature systematically
4. Document any issues found
5. Fix routing or API issues as needed
