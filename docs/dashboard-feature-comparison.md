# Dashboard Feature Comparison - Original vs Base UI

## ✅ IMPLEMENTED Features in DashboardBaseUI

1. **Basic Layout**
   - ✅ Pipeline status banner
   - ✅ Opportunity cards
   - ✅ Status filtering
   - ✅ Client filtering
   - ✅ Loading states
   - ✅ Empty states

2. **Data Display**
   - ✅ Relevance score badges
   - ✅ Status badges
   - ✅ Subreddit display
   - ✅ Client name
   - ✅ Title and snippet
   - ✅ AI relevance notes
   - ✅ Upvotes and comments

## ❌ MISSING Features in DashboardBaseUI

### Critical Missing Features

1. **Card Expansion/Collapse**
   - ❌ Expand/collapse individual cards
   - ❌ Show full thread body
   - ❌ Show top comments
   - ❌ Show draft reply

2. **Draft Reply Management**
   - ❌ View draft reply
   - ❌ Edit draft reply inline
   - ❌ Copy draft to clipboard
   - ❌ AI actions (Generate, Rewrite, Make Shorter, Make Longer, Custom prompt)

3. **Account Management**
   - ❌ Display assigned account
   - ❌ Show account password (with show/hide toggle)
   - ❌ Copy password to clipboard
   - ❌ Account stats (posts today, max posts, citation %)
   - ❌ Reassign account button
   - ❌ Account status indicator

4. **Opportunity Actions**
   - ❌ Mark as Published (with permalink input)
   - ❌ Manual verification
   - ❌ Dismiss opportunity (with reason)
   - ❌ Analyze deletion (for deleted_by_mod status)
   - ❌ Pile-on button (for eligible opportunities)

5. **Bulk Operations**
   - ❌ Checkbox selection
   - ❌ Select all toggle
   - ❌ Bulk publish
   - ❌ Bulk dismiss (with reason dialog)
   - ❌ Selection counter

6. **Advanced Filtering**
   - ❌ Score filter (any, ≤0.5, 0.7+, 0.85+, 0.9+)
   - ❌ AI score filter (all, has_ai, no_ai)
   - ❌ Pile-on only toggle
   - ❌ Date range filter (with presets: today, 7d, 30d, 1y)

7. **Thread Preview**
   - ❌ Preview thread button
   - ❌ Thread preview dialog
   - ❌ View full thread content

8. **Pipeline Controls**
   - ❌ Stop search button
   - ❌ Pipeline stats display (threads found, opportunities created)
   - ❌ Real-time status updates

9. **Lazy Loading**
   - ❌ Infinite scroll
   - ❌ Load more on scroll
   - ❌ Sentinel observer

10. **Snackbar Notifications**
    - ❌ Success messages
    - ❌ Error messages
    - ❌ Info messages

11. **Dialogs**
    - ❌ Dismiss dialog (single)
    - ❌ Bulk dismiss dialog
    - ❌ Reassign account dialog
    - ❌ Mark published dialog
    - ❌ Pile-on dialog
    - ❌ Deletion analysis modal
    - ❌ Thread preview dialog

12. **Opportunity Type Indicators**
    - ❌ Primary vs Pile-on badges
    - ❌ Parent opportunity link
    - ❌ Discovered via indicator

13. **Permalink Display**
    - ❌ Show permalink if published
    - ❌ Link to Reddit comment

14. **Discovery Source**
    - ❌ Show how opportunity was discovered (thread_search, pile_on_auto, etc.)

## Feature Count

- **Implemented:** 7 features
- **Missing:** 60+ features
- **Completion:** ~10%

## Priority Order for Implementation

### P0 - Critical (Must Have)
1. Card expansion/collapse
2. Draft reply display and editing
3. Account display with password
4. Mark as Published action
5. Dismiss action
6. Copy to clipboard functions

### P1 - High Priority
7. AI actions (Generate, Rewrite, etc.)
8. Bulk selection and operations
9. Advanced filtering (score, AI score, date range)
10. Reassign account
11. Snackbar notifications

### P2 - Medium Priority
12. Pile-on functionality
13. Thread preview
14. Deletion analysis
15. Lazy loading/infinite scroll
16. Pipeline stop button

### P3 - Nice to Have
17. Opportunity type badges
18. Discovery source display
19. Parent opportunity links
