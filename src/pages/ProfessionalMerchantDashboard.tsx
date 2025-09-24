import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  Filter,
  Search,
  MoreVertical
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProfessionalMerchantDashboard: React.FC = () => {
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
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  // Status configuration
  const statusConfig = {
    'pending': { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      name: 'Pending',
      icon: Clock,
      action: 'Confirm'
    },
    'confirmed': { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      name: 'Confirmed',
      icon: CheckCircle,
      action: 'Process'
    },
    'processing': { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      name: 'Processing',
      icon: Package,
      action: 'Ship'
    },
    'shipped': { 
      color: 'bg-purple-100 text-purple-800 border-purple-200', 
      name: 'Shipped',
      icon: Truck,
      action: 'Deliver'
    },
    'delivered': { 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      name: 'Delivered',
      icon: CheckCircle,
      action: 'Complete'
    },
    'cancelled': { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      name: 'Cancelled',
      icon: X,
      action: 'Closed'
    }
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

  // Enhanced order fetching using the new database function
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

      // Use the enhanced database function that includes order_items
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_merchant_orders_with_products', { 
          p_merchant_code: merchantInfo.merchant_code 
        });

      if (ordersError) {
        console.error('Error fetching orders via function:', ordersError);
        setError('Failed to load orders. Please try again.');
        setOrders([]);
        return;
      }

      console.log('Orders fetched via function:', { 
        count: ordersData?.length || 0, 
        orders: ordersData 
      });

      // Process orders to ensure proper data structure
      const processedOrders = (ordersData || []).map(order => ({
        ...order,
        order_items: order.order_items?.map((item: any) => ({
          ...item,
          product_name: item.product_name || 'Unknown Product',
          product_image: item.product_image || '/assets/placeholder.svg'
        }))
      }));

      // Calculate statistics
      const stats = {
        total: processedOrders.length,
        pending: processedOrders.filter(o => o.status === 'pending').length,
        confirmed: processedOrders.filter(o => o.status === 'confirmed').length,
        processing: processedOrders.filter(o => o.status === 'processing').length,
        shipped: processedOrders.filter(o => o.status === 'shipped').length,
        delivered: processedOrders.filter(o => o.status === 'delivered').length,
        cancelled: processedOrders.filter(o => o.status === 'cancelled').length,
        totalRevenue: processedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      };

      setOrderStats(stats);
      setOrders(processedOrders);

      if (processedOrders.length === 0) {
        console.log('No orders found for merchant:', merchantInfo.merchant_code);
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
    toast({
      title: "Orders Refreshed",
      description: "Order list has been updated.",
      variant: "default"
    });
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
        description: `Order status updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.name || newStatus}`,
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
    // First try to get items from order_items (preferred method)
    if (order.order_items && Array.isArray(order.order_items)) {
      console.log('Using order_items from database function');
      return order.order_items.map((item: any) => ({
        id: item.id,
        name: item.product_name || 'Unknown Product',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        price: item.subtotal || (item.unit_price * item.quantity) || 0,
        image: item.product_image || '/assets/placeholder.svg',
        product_id: item.product_id
      }));
    }
    
    // Fallback to cart_items if order_items is not available
    if (order.cart_items) {
      console.log('Using cart_items as fallback');
      try {
        return typeof order.cart_items === 'string' 
          ? JSON.parse(order.cart_items) 
          : order.cart_items;
      } catch (e) {
        console.error('Error parsing cart items:', e);
        return [];
      }
    }
    
    return [];
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.parent_order?.order_code || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please log in to access the merchant dashboard.</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Sign In
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
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your nursery business and orders</p>
            </div>
            <Button
              variant="outline"
              onClick={refreshOrders}
              disabled={refreshing}
              className="flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{orderStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{orderStats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(orderStats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Store className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Merchant Code</p>
                  <p className="text-2xl font-bold text-gray-900">{merchantInfo.merchant_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Track and manage customer orders</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {orders.length === 0 ? 'No Orders Yet' : 'No Orders Match Your Filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {orders.length === 0 
                    ? "You haven't received any orders yet." 
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {orders.length === 0 && (
                  <div className="text-sm text-gray-500">
                    <p>Merchant Code: <strong>{merchantInfo.merchant_code}</strong></p>
                    <p>Merchant ID: <strong>{merchantInfo.id}</strong></p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const cartItems = getCartItems(order);
                  const status = statusConfig[order.status as keyof typeof statusConfig];
                  const StatusIcon = status?.icon || Clock;
                  
                  return (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.order_code}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(order.created_at)}
                            </p>
                            {order.parent_order && (
                              <p className="text-xs text-blue-600 mt-1">
                                Parent: #{order.parent_order.order_code}
                              </p>
                            )}
                          </div>
                          <Badge className={`${status?.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status?.name || order.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {formatPrice(order.total_amount || 0)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrderDetails(order)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
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
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOrderExpansion(order.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Order Items */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
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
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-600">
                                          Qty: {item.quantity} • {formatPrice(item.unit_price || 0)} each
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-900">
                                        {formatPrice(item.price || 0)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Order Actions */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Order Actions</h4>
                              <div className="space-y-2">
                                {order.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                      className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Confirm Order
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Cancel Order
                                    </Button>
                                  </>
                                )}
                                {order.status === 'confirmed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'processing')}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Package className="w-4 h-4 mr-2" />
                                    Start Processing
                                  </Button>
                                )}
                                {order.status === 'processing' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'shipped')}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                  >
                                    <Truck className="w-4 h-4 mr-2" />
                                    Mark as Shipped
                                  </Button>
                                )}
                                {order.status === 'shipped' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark as Delivered
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
                    <Badge className={statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color}>
                      {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.name || selectedOrder.status}
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
                  <h3 className="font-semibold mb-3">Order Items</h3>
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

export default ProfessionalMerchantDashboard;