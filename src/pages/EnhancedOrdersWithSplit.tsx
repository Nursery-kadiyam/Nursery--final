import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Check, Clock, X, Package, Eye, MapPin, Calendar, Store, Truck, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const EnhancedOrdersWithSplit: React.FC = () => {
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
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());

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

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch parent orders only
      const { data, error } = await supabase
        .from("orders")
        .select(`id, order_code, total_amount, cart_items, created_at, status, delivery_address, parent_order_id, merchant_code`)
        .eq("user_id", user.id)
        .is("parent_order_id", null) // Only show parent orders
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again.');
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch child orders for a parent order
  const fetchChildOrders = async (parentOrderId: string) => {
    try {
      const { data: children, error } = await supabase
        .from("orders")
        .select(`
          id, order_code, total_amount, cart_items, created_at, status, 
          merchant_code, merchant_id, parent_order_id
        `)
        .eq("parent_order_id", parentOrderId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error('Error fetching child orders:', error);
        return [];
      }

      return children || [];
    } catch (err) {
      console.error('Child orders fetch error:', err);
      return [];
    }
  };

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

  const handleViewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    
    // Fetch child orders for this parent order
    const children = await fetchChildOrders(order.id);
    setChildOrders(children);
    
    // Fetch merchant details
    const merchantCodes = [...new Set(children.map(child => child.merchant_code))];
    const merchantDetails = await fetchMerchantDetails(merchantCodes);
    setMerchantDetails(merchantDetails);
  };

  const toggleMerchantExpansion = (merchantCode: string) => {
    const newExpanded = new Set(expandedMerchants);
    if (newExpanded.has(merchantCode)) {
      newExpanded.delete(merchantCode);
    } else {
      newExpanded.add(merchantCode);
    }
    setExpandedMerchants(newExpanded);
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
    
    if (status === 'pending') return 'Pending';
    if (status === 'delivered') return 'Completed';
    if (status === 'shipped') return 'Partially Shipped';
    if (status === 'processing') return 'Processing';
    if (status === 'confirmed') return 'Confirmed';
    
    return statusNames[status] || status;
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
              <Button onClick={() => navigate('/login')} className="w-full">
                Login to Continue
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchOrders} className="w-full">
                Try Again
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h2>
              <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
              <Button onClick={() => navigate('/shop')} className="w-full">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const cartItems = getCartItems(order);
              const orderStatus = getOrderStatus(childOrders);
              const statusText = getOrderStatusText(childOrders);
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <CardTitle className="text-lg">Order #{order.order_code}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Placed on {formatDate(order.created_at)}
                          </p>
                        </div>
                        <Badge className={statusColors[orderStatus] || 'bg-gray-100 text-gray-800'}>
                          {statusText}
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
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {order.delivery_address ? 'Address provided' : 'No address'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-gray-900">
                          {formatPrice(order.total_amount || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Enhanced Order Details Dialog with Merchant Split */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.order_code}</DialogTitle>
              <DialogDescription>
                Order placed on {selectedOrder && formatDate(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Parent Order Info */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Parent Order Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">
                        <strong>Order ID:</strong> {selectedOrder.order_code}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Date:</strong> {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">
                        <strong>Status:</strong> {getOrderStatusText(childOrders)}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Total Amount:</strong> {formatPrice(selectedOrder.total_amount || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Child Orders by Merchant */}
                {childOrders.length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Store className="w-5 h-5 mr-2" />
                      Orders Split by Merchant
                    </h3>
                    <div className="space-y-4">
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
                        const isExpanded = expandedMerchants.has(merchantCode);
                        const merchantTotal = merchantOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                        
                        return (
                          <Card key={merchantCode} className="border-l-4 border-l-green-500">
                            <CardHeader 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleMerchantExpansion(merchantCode)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Store className="w-5 h-5 text-green-600" />
                                  <div>
                                    <CardTitle className="text-lg">
                                      {merchant.name || `Merchant ${merchantCode}`}
                                    </CardTitle>
                                    <p className="text-sm text-gray-600">
                                      {merchantOrders.length} order{merchantOrders.length !== 1 ? 's' : ''} • 
                                      {merchantOrders[0]?.status || 'pending'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-green-600">
                                      {formatPrice(merchantTotal)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Subtotal
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            
                            {isExpanded && (
                              <CardContent>
                                <Separator className="mb-4" />
                                
                                {/* Merchant Details */}
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                  <h4 className="font-semibold mb-2 flex items-center">
                                    <Users className="w-4 h-4 mr-2" />
                                    Merchant Information
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-600">Email:</span> {merchant.email}
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Phone:</span> {merchant.phone}
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="text-gray-600">Address:</span> {merchant.address}
                                    </div>
                                  </div>
                                </div>

                                {/* Merchant Orders */}
                                <div className="space-y-3">
                                  {merchantOrders.map((childOrder) => {
                                    const childCartItems = getCartItems(childOrder);
                                    
                                    return (
                                      <div key={childOrder.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium">
                                              Order #{childOrder.order_code}
                                            </span>
                                            <Badge className={statusColors[childOrder.status] || 'bg-gray-100 text-gray-800'}>
                                              {statusNames[childOrder.status] || childOrder.status}
                                            </Badge>
                                          </div>
                                          <div className="text-right">
                                            <div className="font-semibold text-green-600">
                                              {formatPrice(childOrder.total_amount || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {childCartItems.length} item{childCartItems.length !== 1 ? 's' : ''}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Child Order Items */}
                                        <div className="space-y-1">
                                          {childCartItems.map((item: any, index: number) => (
                                            <div key={index} className="flex justify-between text-sm">
                                              <span className="text-gray-600">
                                                {item.name} (Qty: {item.quantity})
                                              </span>
                                              <span className="font-medium">
                                                {formatPrice(item.price || 0)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No merchant orders found for this parent order.</p>
                  </div>
                )}

                {/* Delivery Address */}
                {selectedOrder.delivery_address && (
                  <div>
                    <h3 className="font-semibold mb-3">Delivery Address</h3>
                    <div className="p-3 bg-gray-50 rounded-lg">
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

                {/* Order Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Order Summary</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(selectedOrder.total_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EnhancedOrdersWithSplit;