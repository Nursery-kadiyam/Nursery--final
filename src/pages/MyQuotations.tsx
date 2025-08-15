import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Check, Clock, X, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useCart } from '../contexts/CartContext';

const MyQuotations: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [user, setUser] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{[key: string]: any}>({});
  const [expandedQuotation, setExpandedQuotation] = useState<string | null>(null);

  // Status badge colors
  const statusColors: {[key: string]: string} = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'waiting_for_admin': 'bg-indigo-100 text-indigo-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'user_confirmed': 'bg-gray-100 text-gray-800'
  };

  // Status display names
  const statusNames: {[key: string]: string} = {
    'pending': 'Pending',
    'waiting_for_admin': 'Admin Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'user_confirmed': 'Order Placed'
  };

  // Fetch user and quotations on mount
  useEffect(() => {
    const fetchUserAndQuotations = async () => {
      setLoading(true);
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // Fetch user's quotations
        const { data: quotationsData, error: quotationsError } = await supabase
          .from('quotations')
          .select('*')
          .eq('user_id', user.id)
          
        
        if (quotationsError) {
          toast({ title: "Error", description: quotationsError.message, variant: "destructive" });
        } else if (quotationsData) {
          // Filter quotations - only show admin-updated quotations, not user-raised quotations
          const filteredQuotations = quotationsData.filter((quotation: any) => {
            // Show if it's an admin-approved quotation (created by admin)
            if (quotation.status === 'approved' && quotation.approved_price) {
              return true;
            }
            // Show if admin has updated the quotation (has admin_updated_at timestamp)
            if (quotation.admin_updated_at) {
              return true;
            }
            // Don't show user-raised quotations that haven't been processed by admin yet
            return false;
          });
          
          setQuotations(filteredQuotations);
          
          // Check for approved quotations and show notification
          const approvedQuotations = filteredQuotations.filter((q: any) => q.status === 'approved');
          if (approvedQuotations.length > 0) {
            toast({
              title: "Approved Quotations Available!",
              description: `You have ${approvedQuotations.length} approved quotation(s) ready for ordering.`,
              variant: "default"
            });
          }
          
          // Fetch product details for all items in quotations
          const productIds = new Set<string>();
          filteredQuotations.forEach(quotation => {
            if (Array.isArray(quotation.items)) {
              quotation.items.forEach((item: any) => {
                if (item.product_id) {
                  productIds.add(item.product_id);
                }
              });
            }
          });
          
          // Fetch product details
          if (productIds.size > 0) {
            const { data: productsData } = await supabase
              .from('products')
              .select('*')
              .in('id', Array.from(productIds));
            
            if (productsData) {
              const productsMap: {[key: string]: any} = {};
              productsData.forEach(product => {
                productsMap[product.id] = product;
              });
              setProducts(productsMap);
            }
          }
        }
      } else {
        // Redirect to login if no user
        toast({ title: "Login Required", description: "Please login to view your quotations", variant: "destructive" });
        navigate('/');
      }
      
      setLoading(false);
    };
    
    fetchUserAndQuotations();
  }, [toast, navigate]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle expanded quotation
  const toggleExpand = (id: string) => {
    if (expandedQuotation === id) {
      setExpandedQuotation(null);
    } else {
      setExpandedQuotation(id);
    }
  };

  // Place order from approved quotation
  const placeOrder = (quotation: any) => {
    if (quotation.status !== 'approved') {
      toast({ title: "Cannot Place Order", description: "You can only place orders for approved quotations", variant: "destructive" });
      return;
    }

    if (!Array.isArray(quotation.items) || quotation.items.length === 0) {
      toast({ title: "Error", description: "No items found in this quotation", variant: "destructive" });
      return;
    }

    // Create cart items from quotation
    const cartItems = quotation.items.map((item: any, index: number) => {
      const product = products[item.product_id];
      if (!product) return null;

      // Calculate individual item price from quotation
      let itemPrice = 0;
              if (quotation.unit_prices) {
            // Parse unit_prices if it's a string, otherwise use as is
            const unitPrices = typeof quotation.unit_prices === 'string'
                ? JSON.parse(quotation.unit_prices || '{}')
                : (quotation.unit_prices || {});
        const pricePerUnit = unitPrices[index] || 0;
        itemPrice = pricePerUnit * item.quantity; // Price per unit × quantity
      } else {
        // Fallback: distribute approved price equally
        itemPrice = quotation.approved_price / quotation.items.length;
      }

      return {
        id: product.id,
        name: product.name,
        price: itemPrice, // Individual item total price
        image: product.image_url,
        quantity: item.quantity,
        category: product.category || 'other',
        quotation_id: quotation.id, // Reference to the quotation
        quotation_code: quotation.quotation_code,
        transport_cost: quotation.transport_cost || 0,
        custom_work_cost: quotation.custom_work_cost || 0
      };
    }).filter(Boolean);

    if (cartItems.length === 0) {
      toast({ title: "Error", description: "Could not create order items from this quotation", variant: "destructive" });
      return;
    }

    // Set cart with quotation items
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Navigate to order summary
    navigate('/order-summary');
    toast({ title: "Order Created", description: `Order created from quotation ${quotation.quotation_code}` });
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white font-montserrat">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-b from-emerald-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4 animate-fade-in">
              Quotations
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              View and manage your quotation requests
            </p>
          </div>
        </section>

        {/* Quotations List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {/* Approved Quotations Banner */}
            {quotations.filter((q: any) => q.status === 'approved' && q.approved_price).length > 0 && (
              <div className="mb-4 sm:mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg sm:text-xl">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-emerald-800">Approved Quotations Ready!</h3>
                      <p className="text-sm sm:text-base text-emerald-600">
                        You have {quotations.filter((q: any) => q.status === 'approved' && q.approved_price).length} approved quotation(s) ready for ordering.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const firstApproved = quotations.find((q: any) => q.status === 'approved' && q.approved_price);
                      if (firstApproved) {
                        placeOrder(firstApproved);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 sm:py-3 font-bold text-sm sm:text-base w-full sm:w-auto"
                  >
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Place Order Now
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-600">Loading your quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-600 mb-4">No quotations found</h2>
                <p className="text-gray-500 mb-8">You haven't requested any quotations yet.</p>
                <Link to="/cart">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3">
                    Request a Quotation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {quotations.map((quotation) => (
                  <Card key={quotation.id} className={`shadow-sm hover:shadow-md border-0 overflow-hidden transition-all duration-300 ${expandedQuotation === quotation.id ? 'ring-2 ring-emerald-500' : ''}`}>
                    <CardContent className="p-0">
                      {/* Quotation Header */}
                      <div 
                        className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => toggleExpand(quotation.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-emerald-800 truncate">
                                {quotation.quotation_code}
                              </h3>
                              <Badge className={`${statusColors[quotation.status] || 'bg-gray-100'} text-xs sm:text-sm whitespace-nowrap`}>
                                {statusNames[quotation.status] || quotation.status}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">Requested on {formatDate(quotation.created_at)}</p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            {quotation.status === 'approved' && (
                              <div className="text-center sm:text-right">
                                <p className="text-xs sm:text-sm text-gray-500">Approved Price:</p>
                                <p className="text-lg sm:text-xl font-bold text-emerald-700">₹{quotation.approved_price}</p>
                              </div>
                            )}
                            
                            {quotation.status === 'approved' && (
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  placeOrder(quotation);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 font-semibold text-sm sm:text-base w-full sm:w-auto"
                              >
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Place Order Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Content */}
                      {expandedQuotation === quotation.id && (
                        <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50 animate-fade-in">
                          <h4 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Quotation Details</h4>
                          
                          {/* Status Timeline */}
                          <div className="mb-4 sm:mb-6">
                            <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${quotation.status !== 'rejected' ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Quotation Requested</p>
                                <p className="text-xs sm:text-sm text-gray-500">{formatDate(quotation.created_at)}</p>
                              </div>
                            </div>
                            
                            {quotation.status === 'waiting_for_admin' ? (
                              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-500 text-white">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm sm:text-base">Merchant Processed</p>
                                  <p className="text-xs sm:text-sm text-gray-500">Merchant has processed your quotation and sent to admin for review</p>
                                </div>
                              </div>
                            ) : quotation.status === 'rejected' ? (
                              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-red-500 text-white">
                                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm sm:text-base">Quotation Rejected</p>
                                  <p className="text-xs sm:text-sm text-gray-500">Your quotation was rejected</p>
                                </div>
                              </div>
                            ) : null}
                            
                            {['waiting_for_admin', 'approved', 'user_confirmed'].includes(quotation.status) ? (
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                                  <Check className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Admin Review</p>
                                  <p className="text-sm text-gray-500">Admin is reviewing your quotation</p>
                                </div>
                              </div>
                            ) : quotation.status !== 'rejected' && (
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Admin Review</p>
                                  <p className="text-sm text-gray-500">Waiting for admin review</p>
                                </div>
                              </div>
                            )}
                            
                            {['approved', 'user_confirmed'].includes(quotation.status) ? (
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                                  <Check className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Quotation Approved</p>
                                  <p className="text-sm text-gray-500">Your quotation has been approved</p>
                                </div>
                              </div>
                            ) : quotation.status !== 'rejected' && (
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Quotation Approval</p>
                                  <p className="text-sm text-gray-500">Waiting for approval</p>
                                </div>
                              </div>
                            )}
                            
                            {quotation.status === 'user_confirmed' ? (
                              <div className="flex items-center space-x-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                                  <Check className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Order Placed</p>
                                  <p className="text-sm text-gray-500">You've placed an order based on this quotation</p>
                                </div>
                              </div>
                            ) : quotation.status === 'approved' && (
                              <div className="flex items-center space-x-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">Place Order</p>
                                  <p className="text-sm text-gray-500">Ready to place your order</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Items Table - Only show for approved quotations */}
                          {quotation.status === 'approved' ? (
                            <>
                              <h4 className="font-semibold text-gray-700 mb-3">Items</h4>
                              <div className="overflow-x-auto">
                                                                 <Table>
                                   <TableHeader>
                                     <TableRow>
                                       <TableHead>Item</TableHead>
                                       <TableHead>Quantity</TableHead>
                                       <TableHead>Product Price</TableHead>
                                       <TableHead>Total Price</TableHead>
                                     </TableRow>
                                   </TableHeader>
                                  <TableBody>
                                    {Array.isArray(quotation.items) && quotation.items.map((item: any, index: number) => {
                                      const product = products[item.product_id];
                                      return (
                                        <TableRow key={index}>
                                          <TableCell>
                                            <div className="flex items-center space-x-3">
                                              {product && product.image_url && (
                                                <img 
                                                  src={product.image_url} 
                                                  alt={product.name} 
                                                  className="w-12 h-12 object-cover rounded-md"
                                                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder.svg'; }}
                                                />
                                              )}
                                              <span>{product ? product.name : item.product_id}</span>
                                            </div>
                                          </TableCell>
                                                                                     <TableCell>{item.quantity}</TableCell>
                                           <TableCell>
                                             {quotation.unit_prices ? (
                                               (() => {
                                                 // Parse unit_prices if it's a string, otherwise use as is
                                                 const unitPrices = typeof quotation.unit_prices === 'string' 
                                                   ? JSON.parse(quotation.unit_prices || '{}') 
                                                   : (quotation.unit_prices || {});
                                                 const pricePerUnit = unitPrices[index] || 0;
                                                 return (
                                                   <span className="font-medium">₹{pricePerUnit.toFixed(2)}</span>
                                                 );
                                               })()
                                             ) : quotation.approved_price ? (
                                               <span className="font-medium">₹{(quotation.approved_price / quotation.items.length).toFixed(2)}</span>
                                             ) : '-'}
                                           </TableCell>
                                           <TableCell>
                                             {quotation.unit_prices ? (
                                               (() => {
                                                 // Parse unit_prices if it's a string, otherwise use as is
                                                 const unitPrices = typeof quotation.unit_prices === 'string' 
                                                   ? JSON.parse(quotation.unit_prices || '{}') 
                                                   : (quotation.unit_prices || {});
                                                 const pricePerUnit = unitPrices[index] || 0;
                                                 const totalForItem = pricePerUnit * (item.quantity || 1);
                                                 return (
                                                   <span className="font-medium">₹{totalForItem.toFixed(2)}</span>
                                                 );
                                               })()
                                             ) : quotation.approved_price ? (
                                               <span className="font-medium">₹{(quotation.approved_price / quotation.items.length).toFixed(2)}</span>
                                             ) : '-'}
                                           </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-yellow-600" />
                                <p className="text-yellow-800 font-medium">Quotation Details Hidden</p>
                              </div>
                              <p className="text-yellow-700 text-sm mt-1">
                                Item details and pricing will be visible once the admin approves your quotation.
                              </p>
                            </div>
                          )}
                          


                          {/* Detailed Costs Breakdown - Only show for approved quotations */}
                          {quotation.status === 'approved' && quotation.unit_prices && (
                            <div className="mt-6">
                              <h4 className="font-semibold text-gray-700 mb-3">Detailed Costs Breakdown</h4>
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="mb-4">
                                  <div className="font-medium text-green-600 text-sm mb-2">Product Costs:</div>
                                  {Array.isArray(quotation.items) ? quotation.items.map((item: any, idx: number) => {
                                    // Parse unit_prices if it's a string, otherwise use as is
                                    const unitPrices = typeof quotation.unit_prices === 'string' 
                                        ? JSON.parse(quotation.unit_prices || '{}') 
                                        : (quotation.unit_prices || {});
                                    const pricePerUnit = unitPrices[idx] || 0;
                                    const totalForItem = pricePerUnit * (item.quantity || 1);
                                    const product = products[item.product_id];
                                    
                                    return (
                                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center space-x-3">
                                                {product?.image_url && (
                                                    <img 
                                                        src={product.image_url} 
                                                        alt={product.name || item.product_name || ''} 
                                                        className="w-8 h-8 object-cover rounded" 
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {product?.name || item.product_name || item.product_id}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Quantity: {item.quantity}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-green-600 font-medium">
                                                    ₹{pricePerUnit} × {item.quantity} = ₹{totalForItem.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                  }) : null}
                                </div>
                                <div className="border-t pt-3">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-gray-600">Transport Cost:</span>
                                        <span className="text-sm font-medium">₹{quotation.transport_cost || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-gray-600">Custom Work Cost:</span>
                                        <span className="text-sm font-medium">₹{quotation.custom_work_cost || 0}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">Total Quote Price:</span>
                                            <span className="text-lg font-bold text-blue-600">₹{quotation.total_quote_price || 0}</span>
                                        </div>
                                    </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Approved Price (if available) */}
                          {quotation.status === 'approved' && quotation.approved_price && (
                            <div className="mt-6 bg-emerald-50 p-6 rounded-lg border-2 border-emerald-200">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-emerald-800 text-lg">✅ Quotation Approved!</h4>
                                <Badge className="bg-emerald-600 text-white">Ready to Order</Badge>
                              </div>
                              <p className="text-2xl font-bold text-emerald-700 mb-2">₹{quotation.approved_price}</p>
                              <p className="text-sm text-emerald-600 mb-4">Your quotation has been approved by admin. You can now place your order.</p>
                              
                              <Button 
                                onClick={() => placeOrder(quotation)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-bold"
                              >
                                <ShoppingBag className="w-5 h-5 mr-2" />
                                Place Order Now
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default MyQuotations;