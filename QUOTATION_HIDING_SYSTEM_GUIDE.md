# 🔒 QUOTATION HIDING SYSTEM GUIDE

## 🎯 **Overview**

This guide explains how the quotation hiding system works, ensuring that when a merchant submits a quotation from the Available Quotes section, that quotation is hidden from the same merchant and moved to their My Submissions section.

## 🔄 **How the System Works**

### **1. Available Quotes Section (MerchantQuotations Component)**
- **Purpose**: Shows quotations that the merchant can still respond to
- **Filtering Logic**: 
  - Fetches all pending user quotation requests (`status = 'pending'` AND `is_user_request = true`)
  - Fetches all quotations this merchant has already submitted (`merchant_code = current_merchant` AND `is_user_request = false`)
  - Filters out quotations where the merchant has already responded
  - Only shows quotations the merchant hasn't responded to yet

### **2. My Submissions Section (MySubmittedQuotations Component)**
- **Purpose**: Shows all quotations that the merchant has submitted
- **Filtering Logic**:
  - Fetches all quotations submitted by this merchant (`merchant_code = current_merchant` AND `is_user_request = false`)
  - Shows all statuses: pending, waiting_for_admin, approved, rejected, closed

### **3. Dashboard Statistics**
- **Available Quotes Count**: Uses the same filtering logic as Available Quotes section
- **Submitted Quotes Count**: Counts all merchant submissions (`is_user_request = false`)

## 🗄️ **Database Structure**

### **Quotations Table Key Fields:**
```sql
- id: Unique quotation identifier
- quotation_code: Shared code linking user requests and merchant responses
- user_id: User who created the quotation request
- merchant_code: Merchant who submitted the response
- is_user_request: Boolean flag (true = user request, false = merchant response)
- status: Current status of the quotation
- items: JSON array of requested items
- unit_prices: JSON array of merchant's pricing
- total_quote_price: Total price quoted by merchant
```

### **Key Relationships:**
- **User Request**: `is_user_request = true`, `merchant_code = null`
- **Merchant Response**: `is_user_request = false`, `merchant_code = 'MERCHANT_CODE'`
- **Linking**: Both share the same `quotation_code`

## 🔧 **Implementation Details**

### **1. Available Quotes Filtering (Updated)**
```typescript
// Fetch pending user requests
const { data: pendingQuotations } = await supabase
    .from('quotations')
    .select('*')
    .eq('status', 'pending')
    .eq('is_user_request', true);

// Fetch merchant's previous responses
const { data: merchantQuotations } = await supabase
    .from('quotations')
    .select('quotation_code')
    .eq('merchant_code', merchantCode)
    .eq('is_user_request', false);

// Filter out already responded quotations
const processedQuotationCodes = new Set(
    merchantQuotations?.map((q: any) => q.quotation_code) || []
);
const availableQuotations = pendingQuotations?.filter((q: any) =>
    !processedQuotationCodes.has(q.quotation_code)
) || [];
```

### **2. My Submissions Filtering (Updated)**
```typescript
// Fetch all merchant submissions
const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('merchant_code', merchantCode)
    .eq('is_user_request', false);
```

### **3. Dashboard Stats (Updated)**
```typescript
// Available quotes count
const availableCount = pendingQuotations?.filter((q: any) => 
    !processedCodes.has(q.quotation_code)
).length || 0;

// Submitted quotes count
const { data: submittedQuotations } = await supabase
    .from('quotations')
    .select('id')
    .eq('merchant_code', merchantCode)
    .eq('is_user_request', false);
```

## 🎨 **User Interface Changes**

### **1. Available Quotes Section**
- Shows only quotations the merchant hasn't responded to
- Each quotation has "Submit Quote" and "Close Quotation" buttons
- After submission, quotation disappears from this section

### **2. My Submissions Section**
- Shows all quotations submitted by the merchant
- Status filter includes: All, Pending, Waiting for Admin, Approved, Rejected, Closed
- Each quotation shows detailed pricing and status information
- Merchants can close their own quotations

### **3. Status Badges**
- **Pending**: ⏳ Pending (for newly submitted quotations)
- **Waiting for Admin**: ⏳ Waiting for Admin
- **Approved**: ✅ APPROVED
- **Rejected**: ❌ Rejected
- **Closed**: 🔒 Closed

## 🔄 **Quotation Flow**

### **1. User Creates Quotation Request**
```
User selects plants → Creates quotation request → 
Status: 'pending', is_user_request: true, merchant_code: null
```

### **2. Merchant Sees Available Quote**
```
Available Quotes section shows the quotation → 
Merchant can submit pricing and details
```

### **3. Merchant Submits Response**
```
Merchant fills form → Submits quote → 
New record created: is_user_request: false, merchant_code: 'MERCHANT_CODE'
```

### **4. Quotation Hidden from Available Quotes**
```
Available Quotes section refreshes → 
Quotation no longer appears (filtered out)
```

### **5. Quotation Appears in My Submissions**
```
My Submissions section shows the quotation → 
Merchant can view details and status
```

## 🧪 **Testing the System**

### **Test Scenario 1: Submit New Quotation**
1. **Login** as a merchant
2. **Go to Available Quotes** section
3. **Find a quotation** to respond to
4. **Fill in pricing** and submit
5. **Verify** quotation disappears from Available Quotes
6. **Check My Submissions** - quotation should appear there

### **Test Scenario 2: Multiple Quotations**
1. **Submit multiple quotations** from Available Quotes
2. **Verify** each disappears after submission
3. **Check My Submissions** - all should appear there
4. **Verify** Available Quotes count decreases
5. **Verify** Submitted Quotes count increases

### **Test Scenario 3: Status Updates**
1. **Submit a quotation** and check status in My Submissions
2. **Admin approves/rejects** the quotation
3. **Refresh My Submissions** - status should update
4. **Verify** status badge changes appropriately

## 🔧 **Troubleshooting**

### **Issue: Quotation Still Shows in Available Quotes After Submission**
**Solution**: Check that the filtering logic is using `is_user_request` flag correctly

### **Issue: Quotation Not Appearing in My Submissions**
**Solution**: Verify that `merchant_code` is set correctly in the submitted quotation

### **Issue: Dashboard Counts Incorrect**
**Solution**: Ensure both Available and Submitted counts use the same filtering logic

### **Issue: Status Not Updating**
**Solution**: Check that the status field is being updated correctly in the database

## 📝 **Code Changes Summary**

### **Files Modified:**
1. **src/pages/MerchantDashboard.tsx**
   - Updated `MerchantQuotations` component filtering
   - Updated `MySubmittedQuotations` component filtering
   - Updated dashboard stats calculation
   - Added "Pending" status to filter options
   - Added "Pending" status badge

### **Key Changes:**
- **Improved Filtering**: Now uses `is_user_request` flag for accurate filtering
- **Consistent Logic**: All components use the same filtering approach
- **Better Status Handling**: Added support for "pending" status
- **Enhanced UI**: Clear status indicators and filtering options

## ✅ **Verification Checklist**

- [ ] Available Quotes only shows unresponded quotations
- [ ] My Submissions shows all merchant quotations
- [ ] Dashboard counts are accurate
- [ ] Status filtering works correctly
- [ ] Status badges display properly
- [ ] Quotations disappear from Available Quotes after submission
- [ ] Quotations appear in My Submissions after submission
- [ ] No duplicate quotations between sections

## 🎉 **Result**

The quotation hiding system now works correctly:
- **Available Quotes**: Only shows quotations the merchant hasn't responded to
- **My Submissions**: Shows all quotations the merchant has submitted
- **Clear Separation**: No overlap between the two sections
- **Accurate Counts**: Dashboard statistics reflect the correct numbers
- **Better UX**: Merchants can easily track their submissions and available opportunities
