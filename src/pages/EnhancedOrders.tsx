import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Check, Clock, X, Package, Eye, MapPin, Calendar, Store, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const EnhancedOrders: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [childOrders, setChildOrders] = useState<{ [parentId: string]: any[] }>({});

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
        .select(`id, order_code, total_amount, cart_items, created_at, status, delivery_address, parent_order_id, merchant_code, quotation_code`)
        .eq("user_id", user.id)
        .is("parent_order_id", null) // Only show parent orders
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again.');
        setOrders([]);
      } else {
        setOrders(data || []);
        
        // Fetch child orders for each parent order
        const childOrdersMap: { [parentId: string]: any[] } = {};
        for (const order of data || []) {
          const { data: children } = await supabase
            .from("orders")
            .select(`id, order_code, total_amount, cart_items, created_at, status, merchant_code, merchant_id`)
            .eq("parent_order_id", order.id)
            .order("created_at", { ascending: true });
          
          childOrdersMap[order.id] = children || [];
        }
        setChildOrders(childOrdersMap);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
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

  const getMerchantName = (merchantCode: string) => {
    if (merchantCode === 'parent' || merchantCode === 'admin') {
      return 'Admin Store';
    }
    return `Merchant ${merchantCode}`;
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
              const isExpanded = expandedOrders.has(order.id);
              const children = childOrders[order.id] || [];
              const cartItems = getCartItems(order);
              
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
                            {children.length > 0 ? `${children.length} merchant${children.length !== 1 ? 's' : ''}` : '1 item'}
                          </div>
                        </div>
                        {children.length > 0 && (
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
                        )}
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
                            Address provided
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrderDetails(order)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>

                    {/* Child Orders (Merchant Split) */}
                    {isExpanded && children.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-gray-700">Order Split by Merchant</h4>
                        <div className="space-y-3">
                          {children.map((childOrder) => {
                            const childCartItems = getCartItems(childOrder);
                            return (
                              <div key={childOrder.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Store className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">
                                      {getMerchantName(childOrder.merchant_code)}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {childOrder.order_code}
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
                                  {childCartItems.slice(0, 3).map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span className="text-gray-600">
                                        {item.name} (Qty: {item.quantity})
                                      </span>
                                      <span className="font-medium">
                                        {formatPrice(item.price || 0)}
                                      </span>
                                    </div>
                                  ))}
                                  {childCartItems.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                      +{childCartItems.length - 3} more items
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                Order placed on {selectedOrder && formatDate(selectedOrder.created_at)}
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

export default EnhancedOrders;