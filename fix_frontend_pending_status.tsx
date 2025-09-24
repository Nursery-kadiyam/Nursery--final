// Frontend Fix: Remove Pending Status and Auto-Confirm Orders
// This file contains the changes needed to remove pending status from the frontend

// ========================================
// 1. UPDATE ORDER STATUS DISPLAY FUNCTIONS
// ========================================

// Replace this function in your components
const getOrderStatusDisplay = (status: string) => {
    switch (status) {
        case 'confirmed':
            return { text: 'Confirmed', variant: 'default', color: 'bg-green-100 text-green-800' };
        case 'shipped':
            return { text: 'Shipped', variant: 'default', color: 'bg-blue-100 text-blue-800' };
        case 'delivered':
            return { text: 'Delivered', variant: 'default', color: 'bg-green-100 text-green-800' };
        case 'cancelled':
            return { text: 'Cancelled', variant: 'destructive', color: 'bg-red-100 text-red-800' };
        default:
            return { text: 'Confirmed', variant: 'default', color: 'bg-green-100 text-green-800' };
    }
};

// ========================================
// 2. UPDATE ORDER STATUS BADGE COMPONENT
// ========================================

// Replace pending status badges with confirmed
const OrderStatusBadge = ({ status }: { status: string }) => {
    const statusDisplay = getOrderStatusDisplay(status);
    
    return (
        <Badge className={statusDisplay.color}>
            {statusDisplay.text}
        </Badge>
    );
};

// ========================================
// 3. UPDATE DASHBOARD STATS CALCULATIONS
// ========================================

// Replace pending order counts with confirmed
const calculateOrderStats = (orders: any[]) => {
    return {
        total: orders.length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        // Remove pending count
    };
};

// ========================================
// 4. UPDATE ORDER FILTERING LOGIC
// ========================================

// Replace pending status filters
const filterOrders = (orders: any[], statusFilter: string) => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'confirmed') return orders.filter(o => o.status === 'confirmed');
    if (statusFilter === 'shipped') return orders.filter(o => o.status === 'shipped');
    if (statusFilter === 'delivered') return orders.filter(o => o.status === 'delivered');
    if (statusFilter === 'cancelled') return orders.filter(o => o.status === 'cancelled');
    return orders;
};

// ========================================
// 5. UPDATE STATUS DROPDOWN OPTIONS
// ========================================

const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    // Remove pending option
];

// ========================================
// 6. UPDATE DEFAULT STATUS VALUES
// ========================================

// Replace all instances of 'pending' with 'confirmed' in state initialization
const [orderStatus, setOrderStatus] = useState<string>('confirmed');
const [merchantStatus, setMerchantStatus] = useState<string>('confirmed');

// ========================================
// 7. UPDATE ORDER CREATION LOGIC
// ========================================

// Ensure orders are created with confirmed status
const createOrder = async (orderData: any) => {
    const order = {
        ...orderData,
        status: 'confirmed', // Always set to confirmed
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Create order in database
    const { data, error } = await supabase
        .from('orders')
        .insert([order]);
    
    return { data, error };
};

// ========================================
// 8. UPDATE ORDER STATUS UPDATE LOGIC
// ========================================

// Prevent setting orders to pending status
const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Don't allow setting to pending
    if (newStatus === 'pending') {
        newStatus = 'confirmed';
    }
    
    const { data, error } = await supabase
        .from('orders')
        .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    
    return { data, error };
};

// ========================================
// 9. UPDATE CSS STYLES
// ========================================

const statusStyles = `
.status-confirmed {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.status-shipped {
    background-color: #dbeafe;
    color: #1e40af;
    border: 1px solid #bfdbfe;
}

.status-delivered {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.status-cancelled {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

/* Remove pending styles */
.status-pending {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}
`;

// ========================================
// 10. UPDATE COMPONENT IMPORTS
// ========================================

// Make sure to import the updated components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export {
    getOrderStatusDisplay,
    OrderStatusBadge,
    calculateOrderStats,
    filterOrders,
    statusOptions,
    createOrder,
    updateOrderStatus,
    statusStyles
};