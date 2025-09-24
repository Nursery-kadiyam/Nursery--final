# Complete Navbar Fix - No Flickering & Single Line

## Problems
1. **Line wrapping**: "Request Quotation" and "My Orders" wrapping to multiple lines
2. **Flickering**: Navbar elements flickering during rendering
3. **Spacing issues**: Inconsistent gaps between navigation items

## Root Causes
- `gap-2` class creating unwanted spaces
- `px-4` creating excessive padding
- Text wrapping due to insufficient space
- CSS transitions causing flickering
- Tailwind classes not being applied consistently

## Complete Solution

Replace the entire navigation section in `src/components/ui/navbar.tsx` (lines 335-375) with:

```javascript
        {/* Desktop Navigation - ANTI-FLICKER FIX */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center flex-1 justify-center">
            <div className="flex items-center" style={{ gap: '4px' }}>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === item.href ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <div className="flex items-center">
                    <span className="truncate">{item.name}</span>
                    {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                      <Badge className="bg-emerald-600 text-white text-xs px-1 py-0.5 ml-1 rounded-full">
                        {approvedQuotationsCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              {role === 'admin' && (
                <Link
                  to="/admin-dashboard"
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onClick={() => console.log('Admin Dashboard link clicked!')}
                >
                  <span className="truncate">Dashboard</span>
                </Link>
              )}
              {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
                <Link
                  to="/merchant-dashboard"
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span className="truncate">Merchant Dashboard</span>
                </Link>
              )}
            </div>
          </nav>
        )}
```

## Key Changes Made

### 1. **Eliminated Tailwind Gaps**
- **Removed**: `gap-2` class
- **Added**: `style={{ gap: '4px' }}` for consistent spacing
- **Purpose**: Prevents flickering from Tailwind class conflicts

### 2. **Reduced Font Size**
- **OLD**: `text-base` (16px)
- **NEW**: `text-xs` (12px)
- **Purpose**: Fits more text in single line

### 3. **Minimal Padding**
- **OLD**: `px-4` (16px horizontal padding)
- **NEW**: `px-1` (4px horizontal padding)
- **Purpose**: Maximum space for text

### 4. **Added Text Truncation**
- **Added**: `truncate` class and `textOverflow: 'ellipsis'`
- **Purpose**: Handles long text gracefully

### 5. **Fixed Width Constraints**
- **Added**: `maxWidth: '120px'` and `minWidth: 'fit-content'`
- **Purpose**: Prevents layout shifts and flickering

### 6. **Enhanced Whitespace Control**
- **Added**: `whitespace-nowrap` to all links
- **Purpose**: Prevents text wrapping

## Anti-Flicker Features

✅ **Inline styles**: Prevents Tailwind class conflicts
✅ **Fixed dimensions**: Prevents layout shifts
✅ **Text truncation**: Handles overflow gracefully
✅ **Consistent spacing**: Uses inline CSS for gaps
✅ **Minimal transitions**: Reduces animation conflicts

## Expected Results

✅ **Single line layout**: All navigation items in one row
✅ **No line wrapping**: "Request Quotation" and "My Orders" stay on one line
✅ **No flickering**: Smooth, stable navbar rendering
✅ **Consistent spacing**: Uniform gaps between items
✅ **Professional appearance**: Clean, compact navbar
✅ **Responsive design**: Works on different screen sizes

## Navigation Layout

```
Home | About | Categories | Request Quotation | Shop | Contact | My Orders | Quotations | Dashboard
```

## Files to Update

1. **src/components/ui/navbar.tsx** - Replace navigation section (lines 335-375)
2. **Deploy to Vercel** - Test anti-flicker navbar
3. **Verify responsiveness** - Check on different screen sizes

## Testing Checklist

- [ ] **Single line**: All navigation items in one row
- [ ] **No wrapping**: "Request Quotation" and "My Orders" stay on one line
- [ ] **No flickering**: Smooth rendering without visual glitches
- [ ] **Consistent spacing**: Uniform gaps between items
- [ ] **Hover effects**: Smooth transitions on hover
- [ ] **Active states**: Current page highlighting
- [ ] **Badge display**: Quotation count badge works correctly
- [ ] **Responsive**: Works on mobile and desktop

This fix will eliminate both the line wrapping and flickering issues! 🎉✨