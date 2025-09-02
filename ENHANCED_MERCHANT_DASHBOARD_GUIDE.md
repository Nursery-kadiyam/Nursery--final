# 🚀 Enhanced Merchant Dashboard Guide

## 📋 **Overview**

The Enhanced Merchant Dashboard provides a comprehensive business management interface for nursery merchants, featuring advanced analytics, order management, stock tracking, and customer feedback systems.

## 🎯 **Key Features**

### **1. Dashboard Overview**
- **Real-time Statistics**: Total products, quotations, orders, and revenue
- **Low Stock Alerts**: Automatic notifications for products with stock < 10
- **Performance Metrics**: Quick insights into business performance
- **Status Indicators**: Visual status badges for different business states

### **2. Product & Stock Management**
- **Stock Count Tracking**: Real-time inventory levels
- **Low Stock Alerts**: Automatic warnings for products below threshold
- **Product Management**: Add, edit, and delete products
- **Category Organization**: Organized product categories
- **Image Management**: Product image upload and management

### **3. Quotation System**
- **Available Quotes**: View and respond to customer requests
- **My Submissions**: Track submitted quotations with detailed pricing
- **Status Tracking**: Monitor quotation status (pending, approved, rejected)
- **Detailed Pricing**: Unit prices, transport costs, and custom work costs

### **4. Order Management**
- **Order Tracking**: View all customer orders
- **Status Updates**: Update order status (Confirmed → Shipped → Delivered)
- **Order Details**: Complete order information with customer details
- **Filtering**: Filter orders by status for easy management

### **5. Analytics & Insights**
- **Monthly Sales Charts**: Visual representation of sales trends
- **Performance Metrics**: Revenue, orders completed, growth rate
- **Top Products**: Best-selling products analysis
- **Business Trends**: Historical data and growth patterns

### **6. Customer Reviews**
- **Rating System**: 5-star rating display
- **Review Management**: View and respond to customer feedback
- **Average Rating**: Overall business rating calculation
- **Customer Insights**: Detailed review analysis

### **7. Reports & Export**
- **Multiple Report Types**: Sales, Inventory, Orders, Reviews
- **Export Formats**: Excel and PDF export options
- **Automated Generation**: Quick report generation
- **Data Analysis**: Comprehensive business insights

## 🗄️ **Database Structure**

### **Orders Table**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    quotation_code TEXT NOT NULL,
    merchant_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    items JSONB,
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    shipping_address JSONB,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### **Reviews Table**
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    merchant_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

## 🎨 **UI Components**

### **Dashboard Cards**
- **Product Card**: Shows total products with low stock alerts
- **Quotation Card**: Displays quotation count with pending indicators
- **Order Card**: Shows order statistics with completion rates
- **Revenue Card**: Displays total revenue with average rating

### **Tab Navigation**
1. **Available Quotes**: Respond to customer requests
2. **My Submissions**: Track submitted quotations
3. **Products & Stock**: Manage inventory
4. **Orders**: Handle customer orders
5. **Analytics**: View business insights
6. **Reviews**: Manage customer feedback
7. **Reports**: Generate business reports

### **Status Badges**
- **Pending**: ⏳ Yellow badge
- **Approved**: ✅ Green badge
- **Rejected**: ❌ Red badge
- **Shipped**: 🚚 Purple badge
- **Delivered**: ✅ Green badge
- **Cancelled**: ❌ Red badge

## 🔧 **Setup Instructions**

### **1. Database Setup**
```bash
# Run the database setup script
psql -d your_database -f setup_merchant_dashboard_tables.sql
```

### **2. Component Integration**
The dashboard components are already integrated into the main `MerchantDashboard.tsx` file:

- `DashboardOverview`: Main statistics cards
- `ProductManagement`: Enhanced with stock alerts
- `OrderManagement`: Complete order handling
- `Analytics`: Business insights and charts
- `Reviews`: Customer feedback management
- `Reports`: Export functionality

### **3. Required Dependencies**
Ensure these packages are installed:
```json
{
  "lucide-react": "^0.263.1",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-dialog": "^1.0.5"
}
```

## 📊 **Analytics Features**

### **Sales Analytics**
- Monthly revenue tracking
- Order completion rates
- Growth trend analysis
- Performance metrics

### **Inventory Analytics**
- Stock level monitoring
- Low stock alerts
- Product performance
- Category analysis

### **Customer Analytics**
- Review ratings
- Customer satisfaction
- Feedback trends
- Service quality metrics

## 🔄 **Workflow Examples**

### **Order Processing Workflow**
1. **Order Received**: Customer places order
2. **Order Confirmed**: Merchant confirms order
3. **Order Shipped**: Merchant ships products
4. **Order Delivered**: Order marked as delivered
5. **Review Requested**: Customer can leave review

### **Quotation Workflow**
1. **Request Received**: Customer submits quotation request
2. **Merchant Response**: Merchant submits pricing
3. **Admin Review**: Admin reviews quotation
4. **Approval/Rejection**: Quotation approved or rejected
5. **Order Placement**: Customer can place order if approved

## 🎯 **Best Practices**

### **Stock Management**
- Set appropriate low stock thresholds
- Regular inventory updates
- Monitor fast-moving products
- Plan for seasonal demand

### **Order Management**
- Quick status updates
- Clear communication with customers
- Track delivery timelines
- Handle cancellations professionally

### **Customer Service**
- Respond to reviews promptly
- Maintain high ratings
- Address customer concerns
- Build customer relationships

## 🚀 **Future Enhancements**

### **Planned Features**
- **Real-time Notifications**: Push notifications for new orders
- **Advanced Analytics**: Machine learning insights
- **Mobile App**: Native mobile application
- **API Integration**: Third-party service integrations
- **Automated Reports**: Scheduled report generation

### **Performance Optimizations**
- **Caching**: Implement Redis caching
- **Pagination**: Large dataset handling
- **Search**: Advanced search functionality
- **Filters**: Enhanced filtering options

## 🔍 **Troubleshooting**

### **Common Issues**
1. **Data Not Loading**: Check database connections
2. **Permission Errors**: Verify RLS policies
3. **Component Errors**: Check import statements
4. **Performance Issues**: Optimize database queries

### **Debug Steps**
1. Check browser console for errors
2. Verify database table structure
3. Test API endpoints
4. Review component props

## 📞 **Support**

For technical support or feature requests:
- Check the troubleshooting section
- Review database setup
- Verify component integration
- Test with sample data

---

**🎉 The Enhanced Merchant Dashboard is now ready to provide comprehensive business management capabilities for nursery merchants!**
