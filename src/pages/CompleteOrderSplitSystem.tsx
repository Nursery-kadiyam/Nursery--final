import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Eye, 
  Clock, 
  CheckCircle, 
  X, 
  Truck, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Store, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CompleteOrderSplitSystem: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0
  });

  // Status badge colors
  const statusColors: {[key: string]: string} = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'confirmed': 'bg-green-100 text-green-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipped': 'bg-purple-100 text-purple-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };

  // Status display names
  const statusNames: {[key: string]: string} = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };

  // Fetch merchant info
  const fetchMerchantInfo = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching merchant info for user:', user.id);
      const { data: merchant, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching merchant info:', error);
        setError('Failed to load merchant information.');
        return;
      }

      console.log('Merchant info found:', merchant);
      setMerchantInfo(merchant);
    } catch (err) {
      console.error('Merchant info fetch error:', err);
      setError('Failed to load merchant information.');
    }
  }, [user]);

  // Enhanced order fetching with multiple approaches
  const fetchOrders = useCallback(async () => {
    if (!user || !merchantInfo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching orders for merchant:', {
        merchant_id: merchantInfo.id,
        merchant_code: merchantInfo.merchant_code
      });

      // Approach 1: Query by merchant_id (preferred)
      const { data: ordersByMerchantId, error: error1 } = await supabase
        .from("orders")
        .select(`
          id, 
          order_code, 
          total_amount, 
          subtotal,
          cart_items, 
          created_at, 
          status, 
          delivery_address, 
          parent_order_id, 
          merchant_code,
          quotation_code,
          user_id,
          merchant_id,
          parent_order:orders!parent_order_id(
            id, order_code, total_amount, created_at, status, user_id, delivery_address
          )
        `)
        .eq("merchant_id", merchantInfo.id)
        .is("parent_order_id", "not", null) // Only child orders
        .order("created_at", { ascending: false });

      console.log('Orders by merchant_id:', { orders: ordersByMerchantId, error: error1 });

      // Approach 2: Query by merchant_code (fallback)
      const { data: ordersByMerchantCode, error: error2 } = await supabase
        .from("orders")
        .select(`
          id, 
          order_code, 
          total_amount, 
          subtotal,
          cart_items, 
          created_at, 
          status, 
          delivery_address, 
          parent_order_id, 
          merchant_code,
          quotation_code,
          user_id,
          merchant_id,
          parent_order:orders!parent_order_id(
            id, order_code, total_amount, created_at, status, user_id, delivery_address
          )
        `)
        .eq("merchant_code", merchantInfo.merchant_code)
        .is("parent_order_id", "not", null) // Only child orders
        .order("created_at", { ascending: false });

      console.log('Orders by merchant_code:', { orders: ordersByMerchantCode, error: error2 });

      // Combine results and remove duplicates
      const allOrders = [...(ordersByMerchantId || []), ...(ordersByMerchantCode || [])];
      const uniqueOrders = allOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      );

      console.log('Combined unique orders:', uniqueOrders);

      // Calculate statistics
      const stats = {
        total: uniqueOrders.length,
        pending: uniqueOrders.filter(o => o.status === 'pending').length,
        confirmed: uniqueOrders.filter(o => o.status === 'confirmed').length,
        processing: uniqueOrders.filter(o => o.status === 'processing').length,
        shipped: uniqueOrders.filter(o => o.status === 'shipped').length,
        delivered: uniqueOrders.filter(o => o.status === 'delivered').length,
        cancelled: uniqueOrders.filter(o => o.status === 'cancelled').length,
        totalRevenue: uniqueOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      };

      setOrderStats(stats);
      setOrders(uniqueOrders);

      if (uniqueOrders.length === 0) {
        console.log('No orders found. Checking all orders for debugging...');
        
        // Debug: Check all orders to see what's in the database
        const { data: allOrdersDebug } = await supabase
          .from("orders")
          .select(`
            id, 
            order_code, 
            merchant_code,
            merchant_id,
            parent_order_id,
            created_at,
            status
          `)
          .order("created_at", { ascending: false })
          .limit(10);
        
        console.log('All recent orders (for debugging):', allOrdersDebug);
      }

    } catch (err) {
      console.error('Orders fetch error:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, merchantInfo]);

  const refreshOrders = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMerchantInfo();
  }, [fetchMerchantInfo]);

  useEffect(() => {
    if (merchantInfo) {
      fetchOrders();
    }
  }, [fetchOrders]);

  const handleViewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      // Update statistics
      setOrderStats(prev => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return prev;
        
        const oldStatus = order.status;
        const newStats = { ...prev };
        
        // Decrease old status count
        if (oldStatus in newStats) {
          newStats[oldStatus as keyof typeof newStats] = Math.max(0, newStats[oldStatus as keyof typeof newStats] - 1);
        }
        
        // Increase new status count
        if (newStatus in newStats) {
          newStats[newStatus as keyof typeof newStats] = (newStats[newStatus as keyof typeof newStats] || 0) + 1;
        }
        
        return newStats;
      });

      toast({
        title: "Status Updated",
        description: `Order status updated to ${statusNames[newStatus] || newStatus}`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const getCartItems = (order: any) => {
    if (!order.cart_items) return [];
    
    try {
      return typeof order.cart_items === 'string' 
        ? JSON.parse(order.cart_items) 
        : order.cart_items;
    } catch (e) {
      console.error('Error parsing cart items:', e);
      return [];
    }
  };

  const getFilteredOrders = () => {
    if (statusFilter === 'all') return orders;
    return orders.filter(order => order.status === statusFilter);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Please Login</h2>
              <p className="text-gray-600 mb-4">You need to be logged in to access the merchant dashboard.</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Login to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!merchantInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Merchant Account Required</h2>
              <p className="text-gray-600 mb-4">You need a merchant account to access this dashboard.</p>
              <Button onClick={() => navigate('/merchant-registration')} className="w-full">
                Register as Merchant
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Merchant Info Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Store className="w-6 h-6 mr-2 text-green-600" />
                {merchantInfo.nursery_name} - Order Split Management
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrders}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Orders
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {orderStats.total}
                </div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {orderStats.pending}
                </div>
                <div className="text-sm text-gray-600">Pending Orders</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPrice(orderStats.totalRevenue)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {merchantInfo.merchant_code}
                </div>
                <div className="text-sm text-gray-600">Merchant Code</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Statistics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Order Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">{orderStats.pending}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{orderStats.confirmed}</div>
                <div className="text-xs text-gray-600">Confirmed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{orderStats.processing}</div>
                <div className="text-xs text-gray-600">Processing</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{orderStats.shipped}</div>
                <div className="text-xs text-gray-600">Shipped</div>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <div className="text-lg font-bold text-emerald-600">{orderStats.delivered}</div>
                <div className="text-xs text-gray-600">Delivered</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">{orderStats.cancelled}</div>
                <div className="text-xs text-gray-600">Cancelled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Split Management</h1>
          <p className="text-gray-600">Manage your portion of multi-merchant orders</p>
        </div>

        {/* Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">Filter by Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {getFilteredOrders().length} of {orders.length} orders
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {getFilteredOrders().length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
              <p className="text-gray-600 mb-4">
                {statusFilter === 'all' 
                  ? "You haven't received any orders yet." 
                  : `No ${statusFilter} orders found.`
                }
              </p>
              <div className="text-sm text-gray-500 mb-4">
                <p>Merchant Code: <strong>{merchantInfo.merchant_code}</strong></p>
                <p>Merchant ID: <strong>{merchantInfo.id}</strong></p>
              </div>
              <Button onClick={refreshOrders} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Orders
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {getFilteredOrders().map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const cartItems = getCartItems(order);
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <CardTitle className="text-lg">Order #{order.order_code}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Received on {formatDate(order.created_at)}
                          </p>
                          {order.quotation_code && (
                            <p className="text-xs text-blue-600">
                              Quotation: {order.quotation_code}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Parent Order: {order.parent_order?.order_code || 'N/A'}
                          </p>
                        </div>
                        <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                          {statusNames[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatPrice(order.total_amount || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOrderExpansion(order.id)}
                          className="ml-2"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Order Summary */}
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{cartItems.length}</span> item{cartItems.length !== 1 ? 's' : ''}
                        </div>
                        {order.delivery_address && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            Delivery address provided
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-gray-700">Your Order Items</h4>
                        <div className="space-y-2">
                          {cartItems.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Qty: {item.quantity} • {formatPrice(item.unit_price || 0)} each
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatPrice(item.price || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Status Actions */}
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold mb-3 text-gray-700">Order Actions</h4>
                          <div className="flex space-x-2">
                            {order.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirm Order
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Start Processing
                              </Button>
                            )}
                            {order.status === 'processing' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'shipped')}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                Mark as Shipped
                              </Button>
                            )}
                            {order.status === 'shipped' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Delivered
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.order_code}</DialogTitle>
              <DialogDescription>
                Order received on {selectedOrder && formatDate(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Order Status</h3>
                    <Badge className={statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800'}>
                      {statusNames[selectedOrder.status] || selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold">Total Amount</h3>
                    <p className="text-lg font-bold text-green-600">
                      {formatPrice(selectedOrder.total_amount || 0)}
                    </p>
                  </div>
                </div>

                {/* Parent Order Info */}
                {selectedOrder.parent_order && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2 text-blue-800">Parent Order Information</h3>
                    <p className="text-sm text-blue-700">
                      Parent Order: #{selectedOrder.parent_order.order_code}
                    </p>
                    <p className="text-sm text-blue-700">
                      Total Parent Amount: {formatPrice(selectedOrder.parent_order.total_amount || 0)}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-3">Your Order Items</h3>
                  <div className="space-y-2">
                    {getCartItems(selectedOrder).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(item.price || 0)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(item.unit_price || 0)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address */}
                {selectedOrder.delivery_address && (
                  <div>
                    <h3 className="font-semibold mb-3">Delivery Address</h3>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(selectedOrder.delivery_address, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CompleteOrderSplitSystem;