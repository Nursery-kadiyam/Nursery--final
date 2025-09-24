# Update "Our Catalog" to "Request Quotation" - Complete Guide

## Files to Update:

### 1. **src/components/ui/navbar.tsx** (Line 48)
**Change:**
```javascript
// OLD:
{ name: "Our Catalog", href: "/catalog" },

// NEW:
{ name: "Request Quotation", href: "/catalog" },
```

### 2. **src/pages/About.tsx** (Line 226)
**Change:**
```javascript
// OLD:
<li><Link to="/catalog" className="hover:text-white transition-colors">Our Catalog</Link></li>

// NEW:
<li><Link to="/catalog" className="hover:text-white transition-colors">Request Quotation</Link></li>
```

### 3. **src/pages/Index.tsx** (Add Request Quotation Button)
**Add this button after the "Order in Bulk" button (around line 210):**
```javascript
// Add this button in the hero section buttons
<Link to="/catalog">
  <Button
    size="lg"
    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
  >
    Request Quotation
    <ArrowRight className="w-5 h-5 ml-2" />
  </Button>
</Link>
```

**Complete button section should look like:**
```javascript
<div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
  <Link to="/shop">
    <Button
      size="lg"
      className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
    >
      Order in Bulk
      <ArrowRight className="w-5 h-5 ml-2" />
    </Button>
  </Link>
  <Link to="/catalog">
    <Button
      size="lg"
      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
    >
      Request Quotation
      <ArrowRight className="w-5 h-5 ml-2" />
    </Button>
  </Link>
  <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
    <DialogTrigger asChild>
      <Button
        size="lg"
        variant="outline"
        className="w-full sm:w-auto border-white text-emerald-800 bg-transparent hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
      >
        Register as Merchant
      </Button>
    </DialogTrigger>
    // ... rest of the dialog content
  </Dialog>
</div>
```

### 4. **src/pages/Catalog.tsx** (Update Page Title)
**Change the main heading (around line 687):**
```javascript
// OLD:
<h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-4">
  🌱 Multi-Plant Selection Form
</h2>

// NEW:
<h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-4">
  🌱 Request Plant Quotation
</h2>
```

## Summary of Changes:

### ✅ **Navigation Updates:**
- **Navbar**: "Our Catalog" → "Request Quotation"
- **Footer**: "Our Catalog" → "Request Quotation"

### ✅ **Homepage Updates:**
- **Added "Request Quotation" button** in hero section
- **Button redirects to `/catalog`** page
- **Styled consistently** with existing buttons

### ✅ **Page Content Updates:**
- **Catalog page title** updated to "Request Plant Quotation"
- **All references** updated throughout the codebase

## Benefits:

✅ **Clear Purpose**: Users immediately understand what the page does
✅ **Regional Friendly**: "Request Quotation" is commonly used in Indian business
✅ **Professional**: Sounds more business-oriented than "Our Catalog"
✅ **Action-Oriented**: Encourages users to take action
✅ **Consistent**: All references updated across the entire application

## Implementation Steps:

1. **Update navbar.tsx** - Change navigation menu item
2. **Update About.tsx** - Change footer link
3. **Update Index.tsx** - Add "Request Quotation" button
4. **Update Catalog.tsx** - Change page heading
5. **Test all links** - Ensure navigation works correctly

This makes the application more intuitive for regional users in India! 🎉✨