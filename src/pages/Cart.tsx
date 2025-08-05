import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  Truck,
  CreditCard,
  Smartphone,
  Building,
  Banknote
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { supabase } from "@/lib/supabase";
import { LoginPopup } from "@/components/ui/login-popup";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { useCart } from '../contexts/CartContext';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Helper function to get category display name
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'commercial': 'Commercial Plants',
      'residential-indoor': 'Indoor Plants',
      'residential-outdoor': 'Outdoor Plants',
      'beautification': 'Beautification',
      'industrial': 'Industrial Plants',
      'landscaping-schools': 'Schools & Hospitals',
      'landscaping-apartments': 'Apartments',
      'landscaping-roads': 'Roads & Avenues'
    };
    return categoryMap[category] || category;
  };

  // Fetch user on mount (for quotation)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    })();
  }, []);

  const handleRequestQuotation = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to request a quotation.", variant: "destructive" });
      return;
    }
    // Generate a unique string id for the quotation
    const newId = crypto.randomUUID();
    const year = new Date().getFullYear();
    // Get the count of quotations for this year to generate the next code
    const { count } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .ilike('quotation_code', `QTN-${year}-%`);
    const nextNumber = (count || 0) + 1;
    const quotationCode = `QTN-${year}-${String(nextNumber).padStart(4, '0')}`;
    // Map cartItems to correct structure
    const items = cartItems.map(item => ({ product_id: item.id, quantity: item.quantity }));
    const { data, error } = await supabase
      .from('quotations')
      .insert([{
        id: newId, // Provide the new string id here
        quotation_code: quotationCode, // New formatted code
        user_id: user.id,
        items, // Always array of {product_id, quantity}
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Quotation Requested", description: "Admin will review your request." });
      clearCart();
    }
  };

  const orderSteps = [
    { step: "Browse", completed: true },
    { step: "Cart", completed: true, current: true },
    { step: "Quotation", completed: false },
    { step: "Confirmation", completed: false }
  ];

  return (
    <>
      <div className="min-h-screen bg-white font-montserrat">
        {/* Header */}
        <Navbar />

        {/* Progress Bar */}
        <section className="py-6 bg-emerald-50 border-b border-emerald-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:space-x-4 sm:gap-y-0">
              {orderSteps.map((step, index) => (
                <div key={step.step} className="flex items-center min-w-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 ${step.current
                    ? 'bg-gold-600 text-white'
                    : step.completed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium truncate max-w-[60px] sm:max-w-none ${step.current || step.completed ? 'text-emerald-800' : 'text-gray-500'
                    }`}>
                    {step.step}
                  </span>
                  {index < orderSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 mx-1 sm:mx-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-b from-emerald-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4 animate-fade-in">
              Your Kadiyam Nursery Cart – Ready to Grow!
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Review your selected plants and request a quotation from our team
            </p>
          </div>
        </section>

        {/* Cart Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {cartItems.length > 0 ? (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-emerald-800">Cart Items</h2>
                        {cartItems.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={clearCart}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Cart
                          </Button>
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Plant</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cartItems.map((item) => (
                              <TableRow key={item.id} className="animate-fade-in">
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <img
                                      src={item.image && typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/assets/'))
                                        ? item.image
                                        : '/assets/placeholder.svg'}
                                      alt={item.name}
                                      className="w-16 h-16 object-cover rounded-lg"
                                      onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                    />
                                    <span className="font-semibold text-emerald-800">{item.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-emerald-700">
                                    {getCategoryDisplayName(item.category)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      className="w-8 h-8 hover:bg-emerald-50"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <Input
                                      value={item.quantity}
                                      className="w-16 text-center"
                                      readOnly
                                    />
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      className="w-8 h-8 hover:bg-emerald-50"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-4">
                        {cartItems.map((item) => (
                          <Card key={item.id} className="border border-emerald-100 animate-fade-in">
                            <CardContent className="p-4">
                              <div className="flex flex-col xs:flex-row gap-3">
                                <img
                                  src={item.image && typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/assets/'))
                                    ? item.image
                                    : '/assets/placeholder.svg'}
                                  alt={item.name}
                                  className="w-full xs:w-20 h-20 object-cover rounded-lg mx-auto xs:mx-0 flex-shrink-0"
                                  onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                />
                                <div className="flex-1 flex flex-col justify-between">
                                  <h3 className="font-semibold text-emerald-800 mb-1">{item.name}</h3>
                                  <Badge variant="outline" className="text-emerald-700 mb-2 text-xs">
                                    {getCategoryDisplayName(item.category)}
                                  </Badge>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="flex items-center justify-start gap-2">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="w-6 h-6"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="w-6 h-6"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => removeFromCart(item.id)}
                                        className="w-6 h-6 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <Card className="shadow-lg border-0 sticky top-32">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold text-emerald-800 mb-6">Order Summary</h2>
                      <div className="space-y-4">
                        <Button onClick={handleRequestQuotation} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                          Request a Quotation
                        </Button>
                        <Link to="/my-quotations">
                          <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            View My Quotations
                          </Button>
                        </Link>
                        <Link to="/shop">
                          <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            Continue Shopping
                          </Button>
                        </Link>
                      </div>
                      {/* Delivery Info */}
                      <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Truck className="w-5 h-5 text-emerald-600 mr-2" />
                          <span className="font-semibold text-emerald-800">Delivery Information</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Pan-India delivery in 3-7 days</p>
                        <p className="text-sm text-gray-600">Via eKart, Delhivery, India Post, Shiprocket</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-600 mb-4">Your cart is empty</h2>
                <p className="text-gray-500 mb-8">Discover our amazing plant collection and add some to your cart!</p>
                <Link to="/shop">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Order Flow */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-emerald-800 mb-12">Simple Quotation Process</h2>
            <div className="grid md:grid-cols-6 gap-6 items-center">
              {["Browse", "Add to Cart", "Request Quotation", "Pack", "Ship", "Deliver"].map((step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                    {index + 1}
                  </div>
                  <span className="font-semibold text-emerald-800">{step}</span>
                  {index < 5 && <ArrowRight className="w-6 h-6 text-emerald-400 mt-4 hidden md:block" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Cart;