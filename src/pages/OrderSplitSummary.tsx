import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/ui/navbar';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/components/ui/use-toast';
import { 
  Package, 
  Truck, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Store,
  User
} from 'lucide-react';

interface OrderSplitSummaryProps {
  cartItems: any[];
  quotationCode?: string;
  onConfirmOrder: (merchantGroups: { [merchantCode: string]: any[] }) => void;
  onCancel: () => void;
}

const OrderSplitSummary: React.FC<OrderSplitSummaryProps> = ({
  cartItems,
  quotationCode,
  onConfirmOrder,
  onCancel
}) => {
  const [merchantGroups, setMerchantGroups] = useState<{ [merchantCode: string]: any[] }>({});
  const [merchantDetails, setMerchantDetails] = useState<{ [merchantCode: string]: any }>({});
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupItemsByMerchant();
    fetchMerchantDetails();
  }, [cartItems]);

  const groupItemsByMerchant = () => {
    const groups: { [merchantCode: string]: any[] } = {};
    
    cartItems.forEach(item => {
      const merchantCode = item.selected_merchant || item.merchant_code || 'admin';
      if (!groups[merchantCode]) {
        groups[merchantCode] = [];
      }
      groups[merchantCode].push(item);
    });
    
    setMerchantGroups(groups);
    setLoading(false);
  };

  const fetchMerchantDetails = async () => {
    const merchantCodes = Object.keys(merchantGroups);
    const details: { [merchantCode: string]: any } = {};
    
    for (const merchantCode of merchantCodes) {
      if (merchantCode === 'admin') {
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
    
    setMerchantDetails(details);
  };

  const calculateMerchantTotal = (items: any[]) => {
    return items.reduce((sum, item) => {
      if (item.quotation_id) {
        return sum + Number(item.price || 0);
      }
      return sum + (Number(item.price || 0) * item.quantity);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return Object.values(merchantGroups).reduce((sum, items) => {
      return sum + calculateMerchantTotal(items);
    }, 0);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading order summary...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Split Summary</h1>
            <p className="text-gray-600">
              Review how your order will be split across different merchants
              {quotationCode && ` for quotation ${quotationCode}`}
            </p>
          </div>

          {/* Order Split Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Split Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(merchantGroups).length}
                  </div>
                  <div className="text-sm text-gray-600">Merchants</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {cartItems.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPrice(calculateGrandTotal())}
                  </div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merchant Orders */}
          <div className="space-y-4 mb-8">
            {Object.entries(merchantGroups).map(([merchantCode, items]) => {
              const merchant = merchantDetails[merchantCode] || {};
              const isExpanded = expandedMerchants.has(merchantCode);
              const merchantTotal = calculateMerchantTotal(items);
              
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
                            {items.length} item{items.length !== 1 ? 's' : ''} • 
                            Delivery: 5-7 days
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
                          <User className="w-4 h-4 mr-2" />
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

                      {/* Items List */}
                      <div className="space-y-2">
                        <h4 className="font-semibold mb-2">Items in this order:</h4>
                        {items.map((item, index) => (
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
                                <p className="text-sm text-gray-600">
                                  Qty: {item.quantity} • 
                                  {formatPrice(item.unit_price || 0)} each
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

                      {/* Order Timeline */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Expected Timeline
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            Order confirmed: Immediately
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                            Processing: 1-2 days
                          </div>
                          <div className="flex items-center">
                            <Truck className="w-4 h-4 text-blue-500 mr-2" />
                            Delivery: 5-7 days
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(merchantGroups).map(([merchantCode, items]) => {
                  const merchant = merchantDetails[merchantCode] || {};
                  const merchantTotal = calculateMerchantTotal(items);
                  
                  return (
                    <div key={merchantCode} className="flex justify-between items-center py-2">
                      <span className="text-gray-600">
                        {merchant.name || `Merchant ${merchantCode}`} ({items.length} items)
                      </span>
                      <span className="font-semibold">
                        {formatPrice(merchantTotal)}
                      </span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(calculateGrandTotal())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="px-8"
            >
              Back to Selection
            </Button>
            <Button 
              onClick={() => onConfirmOrder(merchantGroups)}
              className="px-8 bg-green-600 hover:bg-green-700"
            >
              Confirm Order Split
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSplitSummary;