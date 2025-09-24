import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, ArrowRight, Check, Clock, X, Package, Eye, MapPin, Calendar,
  Store, ChevronDown, ChevronUp, Users, Download, MessageSquare, RefreshCw,
  AlertCircle, CheckCircle, DollarSign, Phone, Mail, FileText, RotateCcw,
  Trash2, Search, Filter, Star, Truck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Orders: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [childOrders, setChildOrders] = useState<any[]>([]);
  const [merchantDetails, setMerchantDetails] = useState<{[key: string]: any}>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [refreshing, setRefreshing] = useState(false);

  // Status configuration - NO PENDING STATUS
  const statusConfig = {
    'confirmed': { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      name: 'Confirmed',
      icon: CheckCircle,
      description: 'Order automatically confirmed when placed'
    },
    'processing': { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      name: 'Processing',
      icon: Package,
      description: 'Merchants are preparing your order'
    },
    'shipped': { 
      color: 'bg-purple-100 text-purple-800 border-purple-200', 
      name: 'Partially Shipped',
      icon: Truck,
      description: 'Some items have been shipped'
    },
    'delivered': { 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      name: 'Completed',
      icon: CheckCircle,
      description: 'All items have been delivered'
    },
    'cancelled': { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      name: 'Cancelled',
      icon: X,
      description: 'Order has been cancelled'
    }
  };

  // Fetch child orders for a parent order
  const fetchChildOrders = useCallback(async (parentOrderId: string) => {
    try {
      const { data: childOrders, error } = await supabase
        .from("orders")
        .select(`
          id, order_code, total_amount, status, created_at, merchant_code,
          merchants!inner(nursery_name, merchant_code)
        `)
        .eq("parent_order_id", parentOrderId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error('Error fetching child orders:', error);
        return [];
      }

      return childOrders || [];
    } catch (error) {
      console.error('Error fetching child orders:', error);
      return [];
    }
  }, []);

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try the RPC function, then fallback to direct query
      let userOrders = null;
      let ordersError = null;

      try {
        const { data, error } = await supabase
          .rpc('get_orders_with_products', { p_user_id: user.id });
        
        if (error) {
          console.warn('RPC function failed, trying direct query:', error);
          throw error;
        }
        
        userOrders = data;
      } catch (rpcError) {
        console.log('Falling back to direct query due to RPC error:', rpcError);
        
        // Fallback to direct query with proper joins
        const { data: directOrders, error: directError } = await supabase
          .from("orders")
          .select(`
            id, order_code, total_amount, cart_items, created_at, status, delivery_address, 
            merchant_code, quotation_code,
            merchants(nursery_name, merchant_code, full_name, phone_number, email),
            order_items(
              id, product_id, quantity, price, unit_price, subtotal, quotation_id, merchant_code,
              products(name, image_url)
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (directError) {
          throw directError;
        }

        // Process the direct query results to match the RPC function format
        userOrders = (directOrders || []).map(order => ({
          ...order,
          order_items: order.order_items?.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown Product',
            product_image: item.products?.image_url || '/assets/placeholder.svg',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            merchant_code: item.merchant_code,
            quotation_id: item.quotation_id
          })) || []
        }));
      }

      console.log('Fetched orders from database:', userOrders);
      console.log('Number of orders fetched:', userOrders?.length || 0);

      // Group orders by quotation code to show related orders together
      const groupedOrders = (userOrders || []).reduce((acc, order) => {
        const key = order.quotation_code || order.id;
        if (!acc[key]) {
          acc[key] = {
            quotation_code: order.quotation_code,
            orders: [],
            total_amount: 0,
            created_at: order.created_at
          };
        }
        acc[key].orders.push(order);
        acc[key].total_amount += Number(order.total_amount || 0);
        return acc;
      }, {} as { [key: string]: any });

      // Convert to array format
      const ordersWithGroups = Object.values(groupedOrders);

      console.log('Grouped orders:', groupedOrders);
      console.log('Orders with groups:', ordersWithGroups);
      console.log('Number of grouped orders:', ordersWithGroups.length);

      setOrders(ordersWithGroups);
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);


  // Fetch merchant details
  const fetchMerchantDetails = async (merchantCodes: string[]) => {
    const details: {[key: string]: any} = {};
    
    for (const merchantCode of merchantCodes) {
      if (merchantCode === 'admin' || merchantCode === 'parent') {
        details[merchantCode] = {
          name: 'Admin Store',
          email: 'admin@kadiyamnursery.com',
          phone: 'N/A',
          address: 'Kadiyam Nursery Main Store'
        };
      } else {
        try {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('full_name, nursery_name, email, phone_number, nursery_address')
            .eq('merchant_code', merchantCode)
            .single();
          
          if (merchant) {
            details[merchantCode] = {
              name: merchant.nursery_name || merchant.full_name,
              email: merchant.email,
              phone: merchant.phone_number,
              address: merchant.nursery_address
            };
          }
        } catch (error) {
          console.error(`Error fetching merchant details for ${merchantCode}:`, error);
          details[merchantCode] = {
            name: `Merchant ${merchantCode}`,
            email: 'N/A',
            phone: 'N/A',
            address: 'N/A'
          };
        }
      }
    }
    
    return details;
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrderDetails = async (orderGroup: any) => {
    setSelectedOrder(orderGroup);
    setShowOrderDetails(true);
    
    // Use the orders from the group
    const children = orderGroup.orders || [orderGroup];
    setChildOrders(children);
    
    // Fetch merchant details
    const merchantCodes = [...new Set(children.map(child => child.merchant_code))];
    const merchantDetails = await fetchMerchantDetails(merchantCodes);
    setMerchantDetails(merchantDetails);
  };


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
    console.log('getCartItems called with order:', order);
    
    // First try to get items from order_items (preferred method)
    if (order.order_items && Array.isArray(order.order_items)) {
      console.log('Using order_items from database function');
      return order.order_items.map((item: any) => ({
        name: item.product_name || item.name,
        image: item.product_image || item.image || item.image_url,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price: item.subtotal || (item.unit_price * item.quantity),
        variety: item.variety,
        plant_type: item.plant_type,
        age_category: item.age_category,
        bag_size: item.bag_size,
        height_range: item.height_range,
        stem_thickness: item.stem_thickness,
        weight: item.weight,
        is_grafted: item.is_grafted,
        delivery_timeline: item.delivery_timeline,
        has_modified_specs: item.has_modified_specs
      }));
    }
    
    // Fallback to cart_items if order_items not available
    if (order.cart_items) {
      console.log('Using cart_items as fallback');
      try {
        const items = typeof order.cart_items === 'string' 
          ? JSON.parse(order.cart_items) 
          : order.cart_items;
        console.log('Parsed cart items:', items);
        return items;
      } catch (e) {
        console.error('Error parsing cart items:', e);
        return [];
      }
    }
    
    console.log('No items found in order');
    return [];
  };

  const getOrderStatus = (childOrders: any[]) => {
    if (childOrders.length === 0) return 'pending';
    
    const statuses = childOrders.map(child => child.status);
    const uniqueStatuses = [...new Set(statuses)];
    
    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0];
    }
    
    if (statuses.every(status => status === 'delivered')) {
      return 'delivered';
    }
    
    if (statuses.some(status => status === 'shipped')) {
      return 'shipped';
    }
    
    if (statuses.some(status => status === 'processing')) {
      return 'processing';
    }
    
    if (statuses.some(status => status === 'confirmed')) {
      return 'confirmed';
    }
    
    return 'pending';
  };

  const getOrderStatusText = (childOrders: any[]) => {
    const status = getOrderStatus(childOrders);
    return statusConfig[status as keyof typeof statusConfig]?.name || status;
  };

  const getFilteredAndSortedOrders = () => {
    let filtered = orders;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(orderGroup => {
        const allOrders = orderGroup.orders || [orderGroup];
        return allOrders.some(order => 
          (order.order_code && order.order_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (order.quotation_code && order.quotation_code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(orderGroup => {
        const allOrders = orderGroup.orders || [orderGroup];
        const overallStatus = allOrders.some(order => order.status === 'delivered') ? 'delivered' : 
                           allOrders.some(order => order.status === 'shipped') ? 'shipped' :
                           allOrders.some(order => order.status === 'processing') ? 'processing' :
                           allOrders.some(order => order.status === 'confirmed') ? 'confirmed' : 'confirmed';
        return overallStatus === statusFilter;
      });
    }
    
    // Sort orders
    switch (sortBy) {
      case 'recent':
        filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'price-high':
        filtered = filtered.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
        break;
      case 'price-low':
        filtered = filtered.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
        break;
      default:
        break;
    }
    
    return filtered;
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      // Cancel the order
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(orderGroup => {
        if (orderGroup.orders) {
          // Update individual orders in the group
          const updatedOrders = orderGroup.orders.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
          );
          return { ...orderGroup, orders: updatedOrders };
        } else if (orderGroup.id === orderId) {
          // Update single order
          return { ...orderGroup, status: 'cancelled' };
        }
        return orderGroup;
      }));

      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReorder = (order: any) => {
    // This would typically add items to cart
    toast({
      title: "Reorder",
      description: "Items have been added to your cart for reorder.",
      variant: "default"
    });
    navigate('/cart');
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
              <p className="text-gray-600 mb-4">You need to be logged in to view your orders.</p>
              <Button onClick={() => navigate('/home')} className="w-full">
                Login to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">Track and manage your orders</p>
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

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders by order number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Partially Shipped</SelectItem>
                  <SelectItem value="delivered">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-5 w-5 animate-spin" />
                <span>Loading your orders...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Orders</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchOrders} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (() => {
          const filteredOrders = getFilteredAndSortedOrders();
          return filteredOrders.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {orders.length === 0 ? 'No Orders Yet' : 'No Orders Match Your Filters'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {orders.length === 0 
                    ? "You haven't placed any orders yet." 
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {orders.length === 0 && (
                  <Button onClick={() => navigate('/shop')} className="w-full">
                    Start Shopping
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((orderGroup) => {
                const allOrders = orderGroup.orders || [orderGroup];
                const totalItems = allOrders.reduce((sum, order) => sum + (getCartItems(order).length || 0), 0);
                const overallStatus = allOrders.some(order => order.status === 'delivered') ? 'delivered' : 
                                   allOrders.some(order => order.status === 'shipped') ? 'shipped' :
                                   allOrders.some(order => order.status === 'processing') ? 'processing' :
                                   allOrders.some(order => order.status === 'confirmed') ? 'confirmed' : 'confirmed';
                const status = statusConfig[overallStatus as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;
                
                return (
                  <Card key={orderGroup.quotation_code || orderGroup.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <CardTitle className="text-lg">
                              {orderGroup.quotation_code ? `Quotation: ${orderGroup.quotation_code}` : `Order: ${allOrders[0]?.order_code}`}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              Placed on {formatDate(orderGroup.created_at)}
                            </p>
                            {allOrders.length > 1 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {allOrders.length} orders from {new Set(allOrders.map(o => o.merchant_code)).size} merchants
                              </p>
                            )}
                          </div>
                          <Badge className={`${status?.color} border flex items-center`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status?.name || overallStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              {formatPrice(orderGroup.total_amount || 0)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrderDetails(orderGroup)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Store className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {allOrders.length > 1 
                              ? `${allOrders.length} merchant${allOrders.length !== 1 ? 's' : ''}`
                              : 'Single merchant'
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {allOrders[0]?.delivery_address ? 'Address provided' : 'No address'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {status?.description || 'Order processing'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(order)}
                            className="text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reorder
                          </Button>
                          {overallStatus === 'confirmed' && allOrders.length === 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelOrder(allOrders[0].id)}
                              className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* Streamlined Order Details Dialog */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.order_code || selectedOrder?.id?.substring(0, 8) || 'N/A'}</DialogTitle>
              <DialogDescription>
                Order placed on {selectedOrder && formatDate(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Header Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Order Information</h3>
                      <p className="text-sm text-gray-600">
                        <strong>Order ID:</strong> {selectedOrder.order_code || selectedOrder.id?.substring(0, 8) || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Date & Time:</strong> {formatDate(selectedOrder.created_at)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Overall Status:</strong> 
                        <Badge className={`ml-2 ${statusConfig[getOrderStatus(childOrders) as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {getOrderStatusText(childOrders)}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Payment Information</h3>
                      <p className="text-sm text-gray-600">
                        <strong>Payment Status:</strong> Paid
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Payment Method:</strong> UPI
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Total Amount:</strong> 
                        <span className="font-semibold text-green-600 ml-2">
                          {formatPrice(selectedOrder.total_amount || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {selectedOrder.delivery_address && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Name:</strong> {selectedOrder.delivery_address.name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Phone:</strong> {selectedOrder.delivery_address.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Address:</strong> {selectedOrder.delivery_address.address || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>City:</strong> {selectedOrder.delivery_address.city || 'N/A'}, {selectedOrder.delivery_address.district || 'N/A'} - {selectedOrder.delivery_address.pincode || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quotation Information */}
                {selectedOrder.quotation_code && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Quotation Information</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Quotation Code:</strong> {selectedOrder.quotation_code}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Order Type:</strong> Quotation-based Order
                    </p>
                  </div>
                )}

                {/* Order Items Grouped by Merchant */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Order Items</h3>
                  {childOrders.length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(
                        childOrders.reduce((acc, child) => {
                          if (!acc[child.merchant_code]) {
                            acc[child.merchant_code] = [];
                          }
                          acc[child.merchant_code].push(child);
                          return acc;
                        }, {} as {[key: string]: any[]})
                      ).map(([merchantCode, merchantOrders]) => {
                        const merchant = merchantDetails[merchantCode] || {};
                        const merchantTotal = merchantOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                        const merchantStatus = merchantOrders[0]?.status || 'confirmed';
                        const statusInfo = statusConfig[merchantStatus as keyof typeof statusConfig];
                        
                        return (
                          <Card key={merchantCode} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-lg">
                                    {merchant.nursery_name || `Merchant ${merchantCode}`}
                                  </CardTitle>
                                  <p className="text-sm text-gray-600">
                                    <strong>Merchant Code:</strong> {merchantCode}
                                  </p>
                                  {merchant.phone_number && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Contact:</strong> {merchant.phone_number}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    Delivery Status: 
                                    <Badge className={`ml-2 ${statusInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                                      {statusInfo?.name || merchantStatus}
                                    </Badge>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-green-600">
                                    {formatPrice(merchantTotal)}
                                  </div>
                                  <div className="text-sm text-gray-500">Subtotal</div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {merchantOrders.map((childOrder) => {
                                  const childCartItems = getCartItems(childOrder);
                                  return childCartItems.map((item: any, index: number) => (
                                    <div key={`${childOrder.id}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                      {/* Plant Header with Image */}
                                      <div className="flex items-start gap-4 mb-4">
                                        <img
                                          src={item.image || item.image_url || '/assets/placeholder.svg'}
                                          alt={item.name}
                                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                          onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                        />
                                      <div className="flex-1">
                                          <h4 className="font-bold text-lg text-gray-900 mb-2">{item.name}</h4>
                                          
                                          {/* Plant Specifications */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {item.variety && item.variety !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Variety:</span>
                                                <span className="text-sm text-gray-900">{item.variety}</span>
                                              </div>
                                            )}
                                            {item.plant_type && item.plant_type !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Type:</span>
                                                <span className="text-sm text-gray-900">{item.plant_type}</span>
                                              </div>
                                            )}
                                            {item.age_category && item.age_category !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Age:</span>
                                                <span className="text-sm text-gray-900">{item.age_category}</span>
                                              </div>
                                            )}
                                            {item.bag_size && item.bag_size !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Bag Size:</span>
                                                <span className="text-sm text-gray-900">{item.bag_size}</span>
                                              </div>
                                            )}
                                            {item.height_range && item.height_range !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Height:</span>
                                                <span className="text-sm text-gray-900">{item.height_range}</span>
                                              </div>
                                            )}
                                            {item.stem_thickness && item.stem_thickness !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Stem:</span>
                                                <span className="text-sm text-gray-900">{item.stem_thickness}</span>
                                              </div>
                                            )}
                                            {item.weight && item.weight !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Weight:</span>
                                                <span className="text-sm text-gray-900">{item.weight}</span>
                                              </div>
                                            )}
                                            {item.is_grafted !== undefined && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Grafted:</span>
                                                <span className="text-sm text-gray-900">{item.is_grafted ? 'Yes' : 'No'}</span>
                                              </div>
                                            )}
                                            {item.delivery_timeline && item.delivery_timeline !== '-' && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Delivery:</span>
                                                <span className="text-sm text-gray-900">{item.delivery_timeline}</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Modified Specifications Indicator */}
                                          {item.has_modified_specs && (
                                            <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-yellow-800">⚠️ Modified Specifications</span>
                                                <span className="text-xs text-yellow-700">Some specifications were modified by the merchant</span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Pricing Information */}
                                          <div className="border-t border-gray-200 pt-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Quantity:</span>
                                                <span className="text-sm font-bold text-gray-900">{item.quantity} units</span>
                                      </div>
                                      <div className="text-right">
                                                <div className="text-lg font-bold text-green-700">
                                                  {formatPrice((item.unit_price || 0) * (item.quantity || 0))}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {formatPrice(item.unit_price || 0)} × {item.quantity} = {formatPrice((item.unit_price || 0) * (item.quantity || 0))}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Quotation Information */}
                                            {item.quotation_code && (
                                              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-medium text-green-800">Quotation Price</span>
                                                  <Badge className="bg-green-100 text-green-800 font-mono text-xs">
                                                    {item.quotation_code}
                                                  </Badge>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ));
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No items found for this order.</p>
                    </div>
                  )}
                </div>

                {/* Delivery Address */}
                {selectedOrder.delivery_address && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm space-y-1">
                        {typeof selectedOrder.delivery_address === 'object' ? (
                          <>
                            {selectedOrder.delivery_address.name && (
                              <div><strong>Name:</strong> {selectedOrder.delivery_address.name}</div>
                            )}
                            {selectedOrder.delivery_address.phone && (
                              <div><strong>Phone:</strong> {selectedOrder.delivery_address.phone}</div>
                            )}
                            {selectedOrder.delivery_address.addressLine && (
                              <div><strong>Address:</strong> {selectedOrder.delivery_address.addressLine}</div>
                            )}
                            {selectedOrder.delivery_address.city && (
                              <div><strong>City:</strong> {selectedOrder.delivery_address.city}</div>
                            )}
                            {selectedOrder.delivery_address.state && (
                              <div><strong>State:</strong> {selectedOrder.delivery_address.state}</div>
                            )}
                            {selectedOrder.delivery_address.pincode && (
                              <div><strong>Pincode:</strong> {selectedOrder.delivery_address.pincode}</div>
                            )}
                            {selectedOrder.delivery_address.addressType && (
                              <div><strong>Type:</strong> {selectedOrder.delivery_address.addressType}</div>
                            )}
                          </>
                        ) : (
                          <div>{selectedOrder.delivery_address}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Order Total</h3>
                  <div className="space-y-2">
                    {childOrders.length > 0 && (
                      <div className="space-y-1">
                        {Object.entries(
                          childOrders.reduce((acc, child) => {
                            if (!acc[child.merchant_code]) {
                              acc[child.merchant_code] = [];
                            }
                            acc[child.merchant_code].push(child);
                            return acc;
                          }, {} as {[key: string]: any[]})
                        ).map(([merchantCode, merchantOrders]) => {
                          const merchant = merchantDetails[merchantCode] || {};
                          const merchantTotal = merchantOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                          return (
                            <div key={merchantCode} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {merchant.name || `Merchant ${merchantCode}`}:
                              </span>
                              <span className="font-medium">
                                {formatPrice(merchantTotal)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg font-semibold">
                            <span>Grand Total:</span>
                            <span className="text-green-600">
                              {formatPrice(selectedOrder.total_amount || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Truck className="w-4 h-4 mr-2" />
                    Track Order
                  </Button>
                  {getOrderStatus(childOrders) === 'confirmed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleReorder(selectedOrder)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reorder
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Orders;
