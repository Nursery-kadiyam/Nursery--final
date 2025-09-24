# 🌱 Merchant Specification Modification System Guide

## 🎯 **Overview**

This guide explains the new merchant specification modification system that allows merchants to modify user-provided specifications and submit their responses. Users will see only the modified specifications from merchant responses.

## 🔄 **System Flow**

### **1. User Side:**
1. User creates quotation request with specifications
2. User sees merchant responses with modified specifications
3. User can compare original vs modified specifications
4. User selects merchants based on modified specifications

### **2. Merchant Side:**
1. Merchant receives quotation request with user specifications
2. Merchant can modify any specification field (variety, age, height, etc.)
3. Merchant submits response with modified specifications
4. Modified specifications are stored in JSON format in database

### **3. Database:**
1. New `modified_specifications` column stores merchant modifications
2. JSON structure: `{"item_index": {"field_name": "modified_value"}}`
3. Functions updated to handle modified specifications

## 🗄️ **Database Changes**

### **New Column Added:**
```sql
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS modified_specifications JSONB;
```

### **JSON Structure Example:**
```json
{
  "0": {
    "variety": "Modified Variety Name",
    "age_category": "2 years",
    "height_range": "3-4 ft",
    "stem_thickness": "3",
    "bag_size": "8\"",
    "is_grafted": true,
    "delivery_timeline": "Within 10 days",
    "notes": "Additional merchant notes"
  },
  "1": {
    "variety": "Another Modified Variety",
    "age_category": "1 year",
    "height_range": "2-3 ft"
  }
}
```

## 🎨 **UI Changes**

### **Merchant Dashboard:**
- **Editable Fields**: All specification fields are now input fields
- **Real-time Updates**: Changes are tracked in state
- **Submit Response**: Button changed from "Submit Quote" to "Submit Response"
- **Removed Delivery Days**: Merchants cannot set delivery days (user's timeline is fixed)

### **User View (MyQuotations):**
- **Modified Specifications**: Shows merchant-modified values
- **Visual Indicators**: "(Modified)" labels for changed specifications
- **Comparison**: Users can see what merchants changed
- **Additional Info**: Shows modified delivery timeline and notes

## 🔧 **Implementation Details**

### **1. Merchant Dashboard Updates:**

#### **State Management:**
```typescript
const [modifiedSpecs, setModifiedSpecs] = useState<{ 
  [quotationId: string]: { 
    [itemIndex: number]: any 
  } 
}>({});
```

#### **Specification Change Handler:**
```typescript
const handleSpecificationChange = (quotationId: string, itemIndex: number, field: string, value: string) => {
  setModifiedSpecs(prev => ({
    ...prev,
    [quotationId]: {
      ...prev[quotationId],
      [itemIndex]: {
        ...prev[quotationId]?.[itemIndex],
        [field]: value
      }
    }
  }));
};
```

#### **Get Specification Value:**
```typescript
const getSpecificationValue = (quotationId: string, itemIndex: number, field: string, originalValue: any) => {
  const modifiedValue = modifiedSpecs[quotationId]?.[itemIndex]?.[field];
  return modifiedValue !== undefined ? modifiedValue : originalValue;
};
```

### **2. User View Updates:**

#### **Modified Specifications Display:**
```typescript
// Get modified specifications from merchant response
const modifiedSpecs = response.modified_specifications || {};
const itemModifiedSpecs = modifiedSpecs[itemIdx] || {};

// Display modified value with fallback to original
<span>{itemModifiedSpecs.plant_type || item.plant_type || '-'}</span>
{itemModifiedSpecs.plant_type && itemModifiedSpecs.plant_type !== item.plant_type && (
  <span className="text-xs text-blue-600 font-medium">(Modified)</span>
)}
```

### **3. Database Function Updates:**

#### **Updated Function Parameters:**
```sql
CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_simple(
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_unit_prices NUMERIC[],
    p_transport_cost NUMERIC DEFAULT 0,
    p_custom_work_cost NUMERIC DEFAULT 0,
    p_estimated_delivery_days INTEGER DEFAULT 7,
    p_modified_specifications JSONB DEFAULT NULL
)
```

## 📱 **User Experience**

### **For Merchants:**
- **Clear Interface**: All specification fields are clearly labeled and editable
- **Real-time Feedback**: Changes are immediately visible
- **Easy Submission**: Single "Submit Response" button
- **No Delivery Days**: Cannot modify user's delivery timeline

### **For Users:**
- **Transparency**: Can see exactly what merchants changed
- **Visual Indicators**: Clear "(Modified)" labels
- **Informed Decisions**: Can compare original vs modified specifications
- **Complete Information**: See all merchant modifications including notes

## 🚀 **Setup Instructions**

### **1. Database Setup:**
```bash
# Run the database migration
psql -d your_database -f add_modified_specifications_column.sql
psql -d your_database -f update_merchant_quotation_functions.sql
```

### **2. Frontend Updates:**
The following files have been updated:
- `src/pages/MerchantDashboard.tsx` - Merchant specification modification interface
- `src/pages/MyQuotations.tsx` - User view with modified specifications

### **3. Testing:**
1. Create a quotation request as a user
2. Login as a merchant and modify specifications
3. Submit the response
4. View the response as a user to see modified specifications

## 🔍 **Key Features**

### **Editable Specification Fields:**
- Variety
- Plant Type
- Age Category
- Height Range
- Stem Thickness
- Bag Size
- Grafted Status (Yes/No dropdown)
- Delivery Location
- Delivery Timeline
- Notes

### **Visual Indicators:**
- "(Modified)" labels for changed specifications
- Blue color coding for modifications
- Clear comparison between original and modified values

### **Data Integrity:**
- All modifications stored in JSON format
- Fallback to original values if no modification
- Proper error handling and validation

## 🎯 **Benefits**

1. **Merchant Flexibility**: Merchants can adjust specifications based on their inventory
2. **User Transparency**: Users see exactly what merchants are offering
3. **Better Communication**: Merchants can add notes and modify delivery timelines
4. **Informed Decisions**: Users can make better choices based on modified specifications
5. **Data Persistence**: All modifications are properly stored and retrievable

## 🔧 **Technical Notes**

- **JSON Storage**: Modified specifications stored as JSONB for efficient querying
- **State Management**: React state tracks modifications in real-time
- **Database Functions**: Updated to handle modified specifications parameter
- **Error Handling**: Proper validation and error messages
- **Performance**: Efficient queries with proper indexing

This system provides a complete solution for merchant specification modification while maintaining transparency and user control.