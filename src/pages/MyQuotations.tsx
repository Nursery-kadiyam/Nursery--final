import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Check, Clock, X, ShoppingBag, Users, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useCart } from '../contexts/CartContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MyQuotations: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [user, setUser] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{[key: string]: any}>({});
  const [expandedQuotation, setExpandedQuotation] = useState<string | null>(null);
  const [showMerchantResponses, setShowMerchantResponses] = useState<boolean>(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [selectedMerchants, setSelectedMerchants] = useState<{[quotationId: string]: {[itemIndex: number]: string}}>({});

  // Status badge colors
  const statusColors: {[key: string]: string} = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'waiting_for_admin': 'bg-indigo-100 text-indigo-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'user_confirmed': 'bg-gray-100 text-gray-800',
    'order_placed': 'bg-blue-100 text-blue-800'
  };

  // Status display names
  const statusNames: {[key: string]: string} = {
    'pending': 'Pending',
    'waiting_for_admin': 'Admin Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'user_confirmed': 'User Confirmed',
    'order_placed': 'Order Placed'
  };

  // Fetch user and quotations on mount
  useEffect(() => {
    const fetchUserAndQuotations = async () => {
      setLoading(true);
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // Fetch all quotations (both user requests and merchant responses)
        const { data: quotationsData, error: quotationsError } = await supabase
          .from('quotations')
          .select('*')
          .or(`user_id.eq.${user.id},quotation_code.in.(${user.id})`)
          .order('created_at', { ascending: false });
        
        if (quotationsError) {
          toast({ title: "Error", description: quotationsError.message, variant: "destructive" });
        } else if (quotationsData) {
          // Filter to show only user's quotation requests (not merchant responses)
          const userQuotations = quotationsData.filter((quotation: any) => 
            quotation.user_id === user.id && !quotation.merchant_code
          );
          
          setQuotations(userQuotations);
          
          // Fetch product details for all items in quotations
          const productIds = new Set<string>();
          userQuotations.forEach(quotation => {
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

  // Get merchant responses for a quotation
  const getMerchantResponses = async (quotationCode: string) => {
    const { data: responses, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('quotation_code', quotationCode)
      .not('merchant_code', 'is', null);
    
    if (error) {
      console.error('Error fetching merchant responses:', error);
      return [];
    }
    
    return responses || [];
  };

  // View merchant responses
  const handleViewMerchantResponses = async (quotation: any) => {
    setSelectedQuotation(quotation);
    const responses = await getMerchantResponses(quotation.quotation_code);
    setSelectedQuotation({ ...quotation, merchantResponses: responses });
    setShowMerchantResponses(true);
  };

  // Select merchant for a specific item
  const handleSelectMerchant = (quotationId: string, itemIndex: number, merchantCode: string) => {
    setSelectedMerchants(prev => ({
      ...prev,
      [quotationId]: {
        ...prev[quotationId],
        [itemIndex]: merchantCode
      }
    }));
  };

  // Place order with selected merchants
  const placeOrderWithSelectedMerchants = async (quotation: any) => {
    if (!selectedQuotation || !selectedQuotation.merchantResponses) {
      toast({ title: "Error", description: "Please view merchant responses first", variant: "destructive" });
      return;
    }

    const selectedMerchantsForQuotation = selectedMerchants[quotation.id] || {};
    const hasSelections = Object.keys(selectedMerchantsForQuotation).length > 0;

    if (!hasSelections) {
      toast({ title: "Error", description: "Please select merchants for your items", variant: "destructive" });
      return;
    }

    // Create cart items from selected merchants
    const cartItems: any[] = [];
    
    quotation.items.forEach((item: any, itemIndex: number) => {
      const selectedMerchantCode = selectedMerchantsForQuotation[itemIndex];
      if (selectedMerchantCode) {
        const merchantResponse = selectedQuotation.merchantResponses.find((r: any) => 
          r.merchant_code === selectedMerchantCode
        );
        
        if (merchantResponse) {
          const product = products[item.product_id];
          if (product) {
            const unitPrices = typeof merchantResponse.unit_prices === 'string'
              ? JSON.parse(merchantResponse.unit_prices || '{}')
              : (merchantResponse.unit_prices || {});
            const pricePerUnit = unitPrices[itemIndex] || 0;
            const itemPrice = pricePerUnit * item.quantity;

            cartItems.push({
              id: product.id,
              name: product.name,
              price: itemPrice,
              unit_price: pricePerUnit,
              image: product.image_url,
              quantity: item.quantity,
              category: product.categories || 'other',
              quotation_id: quotation.id,
              quotation_code: quotation.quotation_code,
              selected_merchant: selectedMerchantCode,
              transport_cost: merchantResponse.transport_cost || 0,
              custom_work_cost: merchantResponse.custom_work_cost || 0
            });
          }
        }
      }
    });

    if (cartItems.length === 0) {
      toast({ title: "Error", description: "Could not create order items from selected merchants", variant: "destructive" });
      return;
    }

    // Set cart with selected merchant items
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Navigate to order summary
    navigate('/order-summary');
    toast({ 
      title: "Order Created", 
      description: `Order created from quotation ${quotation.quotation_code} with selected merchants` 
    });
  };

  // Place order from approved quotation (legacy function for backward compatibility)
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
      let pricePerUnit = 0;
      
      if (quotation.unit_prices) {
        // Parse unit_prices if it's a string, otherwise use as is
        const unitPrices = typeof quotation.unit_prices === 'string'
            ? JSON.parse(quotation.unit_prices || '{}')
            : (quotation.unit_prices || {});
        pricePerUnit = unitPrices[index] || 0;
        itemPrice = pricePerUnit * item.quantity; // Price per unit × quantity
      } else {
        // Fallback: distribute approved price equally
        pricePerUnit = quotation.approved_price / quotation.items.length;
        itemPrice = pricePerUnit * item.quantity;
      }

      return {
        id: product.id,
        name: product.name,
        price: itemPrice, // Individual item total price
        unit_price: pricePerUnit, // Unit price from quotation
        image: product.image_url,
        quantity: item.quantity,
        category: product.categories || 'other',
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
              My Quotations
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              View your quotation requests and merchant responses
            </p>
          </div>
        </section>

        {/* Quotations List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
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
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewMerchantResponses(quotation);
                              }}
                              variant="outline"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                            >
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                              View Responses
                            </Button>
                            
                            {quotation.status === 'approved' && (
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  placeOrder(quotation);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 font-semibold text-sm sm:text-base w-full sm:w-auto"
                              >
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Place Order
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Content */}
                      {expandedQuotation === quotation.id && (
                        <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50 animate-fade-in">
                          <h4 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Quotation Details</h4>
                          
                          {/* Items Table */}
                          <div className="mb-4 sm:mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Requested Items</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Category</TableHead>
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
                                        <TableCell>{product?.categories || 'N/A'}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                          
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
                            
                            <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-500 text-white">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Merchant Responses</p>
                                <p className="text-xs sm:text-sm text-gray-500">Merchants are responding to your quotation request</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 sm:space-x-4">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-300 text-gray-600">
                                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Select Merchants & Place Order</p>
                                <p className="text-xs sm:text-sm text-gray-500">Choose your preferred merchants for each item</p>
                              </div>
                            </div>
                          </div>
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

      {/* Merchant Responses Dialog */}
      <Dialog open={showMerchantResponses} onOpenChange={setShowMerchantResponses}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Merchant Responses - {selectedQuotation?.quotation_code}</span>
            </DialogTitle>
            <DialogDescription>
              View all merchant responses and select your preferred merchants for each item
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuotation && (
            <div className="space-y-6">
              {/* Quotation Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900">Quotation Code</h4>
                  <p className="text-sm text-gray-600">{selectedQuotation.quotation_code}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Items Requested</h4>
                  <p className="text-sm text-gray-600">{selectedQuotation.items?.length || 0} items</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Merchant Responses</h4>
                  <p className="text-lg font-bold text-blue-600">{selectedQuotation.merchantResponses?.length || 0}</p>
                </div>
              </div>

              {/* Merchant Responses */}
              {selectedQuotation.merchantResponses && selectedQuotation.merchantResponses.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Available Merchant Responses</h3>
                  
                  {selectedQuotation.merchantResponses.map((response: any, responseIdx: number) => (
                    <div key={response.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Merchant: {response.merchant_code}</h4>
                          <p className="text-sm text-gray-500">Submitted: {new Date(response.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">₹{response.total_quote_price || 0}</p>
                          <p className="text-sm text-gray-500">{response.estimated_delivery_days || '-'} days delivery</p>
                        </div>
                      </div>
                      
                      {/* Item Pricing */}
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-700 mb-2">Item Pricing:</h5>
                        <div className="grid gap-2">
                          {Array.isArray(response.items) && response.items.map((item: any, itemIdx: number) => {
                            const product = products[item.product_id];
                            const unitPrices = typeof response.unit_prices === 'string'
                              ? JSON.parse(response.unit_prices || '{}')
                              : (response.unit_prices || {});
                            const pricePerUnit = unitPrices[itemIdx] || 0;
                            const totalForItem = pricePerUnit * (item.quantity || 1);
                            
                            return (
                              <div key={itemIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center space-x-2">
                                  {product?.image_url && (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name} 
                                      className="w-8 h-8 object-cover rounded"
                                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder.svg'; }}
                                    />
                                  )}
                                  <span className="text-sm font-medium">
                                    {product ? product.name : item.product_id}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    (Qty: {item.quantity})
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">₹{pricePerUnit.toFixed(2)} per unit</p>
                                  <p className="text-sm text-green-600 font-bold">₹{totalForItem.toFixed(2)} total</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Additional Costs */}
                      {(response.transport_cost || response.custom_work_cost) && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-800 mb-2">Additional Costs:</h5>
                          <div className="space-y-1 text-sm">
                            {response.transport_cost && (
                              <div className="flex justify-between">
                                <span className="text-blue-700">Transport Cost:</span>
                                <span className="font-medium">₹{response.transport_cost}</span>
                              </div>
                            )}
                            {response.custom_work_cost && (
                              <div className="flex justify-between">
                                <span className="text-blue-700">Custom Work Cost:</span>
                                <span className="font-medium">₹{response.custom_work_cost}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Merchant Selection */}
                  <div className="mt-6 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                    <h3 className="text-lg font-semibold text-emerald-800 mb-4">Select Your Preferred Merchants</h3>
                    <p className="text-emerald-700 mb-4">Choose which merchant to order from for each item:</p>
                    
                    {Array.isArray(selectedQuotation.items) && selectedQuotation.items.map((item: any, itemIdx: number) => {
                      const product = products[item.product_id];
                      const selectedMerchantCode = selectedMerchants[selectedQuotation.id]?.[itemIdx];
                      
                      return (
                        <div key={itemIdx} className="mb-4 p-3 bg-white rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {product?.image_url && (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name} 
                                  className="w-8 h-8 object-cover rounded"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder.svg'; }}
                                />
                              )}
                              <span className="font-medium">{product ? product.name : item.product_id}</span>
                              <span className="text-sm text-gray-500">(Qty: {item.quantity})</span>
                            </div>
                            {selectedMerchantCode && (
                              <Badge className="bg-emerald-600 text-white">Selected: {selectedMerchantCode}</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {selectedQuotation.merchantResponses.map((response: any) => {
                              const unitPrices = typeof response.unit_prices === 'string'
                                ? JSON.parse(response.unit_prices || '{}')
                                : (response.unit_prices || {});
                              const pricePerUnit = unitPrices[itemIdx] || 0;
                              const totalForItem = pricePerUnit * (item.quantity || 1);
                              const isSelected = selectedMerchantCode === response.merchant_code;
                              
                              return (
                                <button
                                  key={response.merchant_code}
                                  onClick={() => handleSelectMerchant(selectedQuotation.id, itemIdx, response.merchant_code)}
                                  className={`p-2 rounded-lg border text-left transition-all ${
                                    isSelected 
                                      ? 'border-emerald-500 bg-emerald-50' 
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{response.merchant_code}</div>
                                  <div className="text-xs text-gray-600">₹{pricePerUnit.toFixed(2)} per unit</div>
                                  <div className="text-sm font-bold text-green-600">₹{totalForItem.toFixed(2)} total</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => placeOrderWithSelectedMerchants(selectedQuotation)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2"
                        disabled={Object.keys(selectedMerchants[selectedQuotation.id] || {}).length === 0}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Place Order with Selected Merchants
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-yellow-50 rounded-lg">
                  <Users className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <p className="text-yellow-800 font-medium">No merchant responses yet</p>
                  <p className="text-yellow-600 text-sm mt-1">Merchants will respond to your quotation request soon</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyQuotations;