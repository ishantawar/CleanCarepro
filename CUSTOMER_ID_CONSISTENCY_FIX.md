# Customer ID Consistency Fix

## Problem Description

The booking system was experiencing inconsistent customer ID handling between booking creation and booking history retrieval. The same user (phone number) was getting different customer IDs, causing booking history to appear incomplete or missing.

### Root Cause

The system had **two separate user collections**:

1. **CleanCareUser** (in OTP authentication) - Used for user login/authentication
2. **User** (in booking system) - Used for booking creation and management

When a user authenticated via OTP, they got a `CleanCareUser` record with one ObjectId. When creating bookings, the system would create a separate `User` record with a different ObjectId for the same phone number.

### Example from Logs

```
During booking creation:
- User ID: "user_9717619183"
- Phone: "9717619183"
- Created User ObjectId: "686763b56bd53fb937649297"

During booking retrieval:
- Looking for customer ID: "685dc042261a5c3f88ddd037" (different ObjectId!)
```

## Solution

### 1. Consolidated Customer Lookup Logic

**Backend Changes** (`backend/routes/bookings.js`):

#### Booking Creation

- **Phone-first strategy**: Always extract phone number from customer_id
- **Unified lookup**: Check for existing `User` record by phone
- **Fallback creation**: If no `User` exists but `CleanCareUser` exists, create corresponding `User` record
- **Single source of truth**: Always use the `User` collection ObjectId for bookings

#### Booking Retrieval

- **Same lookup logic**: Use identical customer resolution strategy
- **Consistency check**: Ensure `User` record exists for every `CleanCareUser`
- **Auto-repair**: Create missing `User` records on-demand to maintain consistency

### 2. Data Consolidation Script

**New Script** (`backend/scripts/consolidate-customer-ids.js`):

```bash
cd backend
node scripts/consolidate-customer-ids.js
```

This script:

- ✅ Creates `User` records for all existing `CleanCareUser` records
- ✅ Consolidates duplicate `User` records (same phone number)
- ✅ Moves all bookings to the primary (oldest) `User` record
- ✅ Removes duplicate customer records
- ✅ Ensures one-to-one mapping: 1 phone number = 1 User record

### 3. Improved Error Handling

- **Race condition protection**: Handles concurrent customer creation
- **Graceful fallbacks**: Multiple lookup strategies for robustness
- **Detailed logging**: Better debugging and monitoring capabilities

## Implementation Details

### Customer ID Resolution Flow

```
Input: customer_id (various formats)
  ↓
Extract phone number:
  - "user_9717619183" → "9717619183"
  - "9717619183" → "9717619183"
  - ObjectId → lookup to get phone
  ↓
Find/Create User record:
  1. Look for User by phone
  2. If not found, check CleanCareUser
  3. Create User from CleanCareUser data
  4. Always use User ObjectId for bookings
  ↓
Result: Single, consistent User ObjectId
```

### Database Schema Alignment

Both collections now maintain consistency:

**CleanCareUser** (Authentication):

```javascript
{
  _id: ObjectId,
  phone: "9717619183",
  name: "John Doe",
  isVerified: true
}
```

**User** (Bookings):

```javascript
{
  _id: ObjectId,  // ← This is used for all bookings
  phone: "9717619183",  // ← Links to CleanCareUser
  full_name: "John Doe",
  user_type: "customer"
}
```

## Testing the Fix

### 1. Run the Consolidation Script

```bash
cd backend
node scripts/consolidate-customer-ids.js
```

### 2. Verify Data Consistency

```bash
# Check that each phone has only one User record
db.users.aggregate([
  { $group: { _id: "$phone", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
# Should return empty array

# Check booking distribution
db.bookings.aggregate([
  { $group: { _id: "$customer_id", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### 3. Test User Flow

1. **Authenticate** with phone number (creates CleanCareUser)
2. **Create booking** (uses/creates corresponding User record)
3. **View booking history** (finds bookings using same User record)
4. **Verify** all bookings appear in history

## Expected Results

### Before Fix

- Same phone number → Multiple customer IDs
- Booking history incomplete or missing
- Data scattered across different records

### After Fix

- Same phone number → Single customer ID
- Complete booking history for each user
- Consolidated data under primary customer record

## Monitoring

The enhanced logging will show:

```
✅ Found existing User by phone: 686763b56bd53fb937649297
🎯 Using target customer ID for booking lookup: 686763b56bd53fb937649297
✅ Found 4 bookings for customer: 686763b56bd53fb937649297
```

## Benefits

1. **Consistent User Experience**: Users see complete booking history
2. **Data Integrity**: One customer record per phone number
3. **Better Analytics**: Accurate customer metrics and reporting
4. **Simplified Debugging**: Clear customer ID resolution logic
5. **Future-Proof**: Robust handling of edge cases and race conditions

---

**Status**: ✅ **IMPLEMENTED**  
**Testing**: Ready for production deployment  
**Rollback**: Consolidation script is idempotent and safe to re-run
