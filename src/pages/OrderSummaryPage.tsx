import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/ui/navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/components/ui/use-toast';



const AnimatedTick = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto mb-4">
        <circle cx="40" cy="40" r="38" fill="#d1fae5" stroke="#10b981" strokeWidth="4" />
        <polyline
            points="25,43 37,55 57,33"
            fill="none"
            stroke="#10b981"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: 'tick-anim 0.7s 0.2s forwards cubic-bezier(.4,2,.6,1)' // custom keyframes below
            }}
        />
        <style>{`
      @keyframes tick-anim {
        to { stroke-dashoffset: 0; }
      }
    `}</style>
    </svg>
);

const FlyingEnvelope = () => (
    <div className="flex justify-center mb-2">
        <svg width="60" height="60" viewBox="0 0 60 60" className="flying-envelope">
            <g>
                <rect x="8" y="18" width="44" height="28" rx="4" fill="#fff" stroke="#fbbf24" strokeWidth="2" />
                <polyline points="8,18 30,38 52,18" fill="none" stroke="#fbbf24" strokeWidth="2" />
            </g>
        </svg>
        <style>{`
      .flying-envelope {
        animation: fly-paper 1.2s cubic-bezier(.4,2,.6,1) 0.2s both;
      }
      @keyframes fly-paper {
        0% { transform: translateY(40px) scale(0.7) rotate(-10deg); opacity: 0; }
        60% { transform: translateY(-10px) scale(1.1) rotate(3deg); opacity: 1; }
        100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
      }
    `}</style>
    </div>
);

const OrderSummaryPage = () => {
    const [cart, setCart] = useState([]);
    const [email, setEmail] = useState('');
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null);
    const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [showAddAddressForm, setShowAddAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        name: '',
        phone: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
        addressType: 'Home',
    });
    const [deliveryAddress, setDeliveryAddress] = useState(null);
    const [showOrderSuccess, setShowOrderSuccess] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const { clearCart } = useCart();
    const [cartProducts, setCartProducts] = useState<any[]>([]);
    const [products, setProducts] = useState<{[key: string]: any}>({});

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUser(null);
                setAddresses([]);
            } else {
                setUser(user);
                
                // Fetch user profile and address from database
                try {
                    const { data: profile, error } = await supabase
                        .from('user_profiles')
                        .select('first_name, last_name, phone, address')
                        .eq('id', user.id)
                        .single();

                    if (!error && profile) {
                        console.log('OrderSummaryPage: User profile loaded:', profile);
                        
                        // Parse address if it's stored as JSON
                        let parsedAddress = null;
                        if (profile.address) {
                            try {
                                parsedAddress = JSON.parse(profile.address);
                            } catch (e) {
                                // Handle old address format
                                parsedAddress = {
                                    address: profile.address,
                                    city: "",
                                    district: "",
                                    pincode: ""
                                };
                            }
                        }

                        // Set addresses array with user profile data
                        const userAddresses = [{
                            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.user_metadata?.first_name || 'User',
                            phone: profile.phone || '',
                            address: parsedAddress?.address || '',
                            city: parsedAddress?.city || '',
                            state: parsedAddress?.district || '',
                            pincode: parsedAddress?.pincode || '',
                            addressType: 'Home'
                        }];
                        
                        setAddresses(userAddresses);
                        setSelectedAddressIdx(0); // Auto-select the first (and only) address
                        setDeliveryAddress(userAddresses[0]); // Set as delivery address
                        
                        console.log('OrderSummaryPage: Addresses set:', userAddresses);
                    } else {
                        console.error('OrderSummaryPage: Error fetching user profile:', error);
                        // Fallback to basic user data
                        const fallbackAddress = {
                            name: user.user_metadata?.first_name || 'User',
                            phone: '',
                            address: '',
                            city: '',
                            state: '',
                            pincode: '',
                            addressType: 'Home'
                        };
                        setAddresses([fallbackAddress]);
                        setSelectedAddressIdx(0);
                        setDeliveryAddress(fallbackAddress);
                    }
                } catch (error) {
                    console.error('OrderSummaryPage: Error in checkUser:', error);
                    // Fallback to basic user data
                    const errorFallbackAddress = {
                        name: user.user_metadata?.first_name || 'User',
                        phone: '',
                        address: '',
                        city: '',
                        state: '',
                        pincode: '',
                        addressType: 'Home'
                    };
                    setAddresses([errorFallbackAddress]);
                    setSelectedAddressIdx(0);
                    setDeliveryAddress(errorFallbackAddress);
                }
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const savedAddresses = localStorage.getItem('addresses');
        const savedIdx = localStorage.getItem('selectedAddressIdx');
        if (savedAddresses) setAddresses(JSON.parse(savedAddresses));
        if (savedIdx) setSelectedAddressIdx(Number(savedIdx));
    }, []);

    useEffect(() => {
        localStorage.setItem('addresses', JSON.stringify(addresses));
        if (selectedAddressIdx !== null) {
            localStorage.setItem('selectedAddressIdx', String(selectedAddressIdx));
        }
    }, [addresses, selectedAddressIdx]);

    useEffect(() => {
        const saved = localStorage.getItem('deliveryAddress');
        if (saved) {
            setDeliveryAddress(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        console.log('OrderSummaryPage: Loading cart from localStorage...');
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('OrderSummaryPage: Cart items loaded:', items);
        setCart(items);
        
        // Check if this is a quotation-based order
        const hasQuotation = items.some((item: any) => item.quotation_id);
        console.log('OrderSummaryPage: Has quotation:', hasQuotation);
        if (hasQuotation) {
            const quotationCode = items[0]?.quotation_code;
            console.log('OrderSummaryPage: Quotation code:', quotationCode);
            toast({
                title: "Quotation Order",
                description: `You're placing an order from approved quotation ${quotationCode}`,
                variant: "default"
            });
        }
    }, []);

    useEffect(() => {
        const fetchCartProducts = async () => {
            console.log('OrderSummaryPage: fetchCartProducts called with cart:', cart);
            if (!cart || cart.length === 0) {
                console.log('OrderSummaryPage: Cart is empty, setting cartProducts to empty array');
                setCartProducts([]);
                return;
            }
            
            // For quotation-based orders, we don't need to fetch from products table
            const hasQuotation = cart.some((item: any) => item.quotation_id);
            console.log('OrderSummaryPage: Has quotation items:', hasQuotation);
            
            if (hasQuotation) {
                // For quotation-based orders, use cart items directly
                console.log('OrderSummaryPage: Using quotation cart items directly');
                const merged = cart.map(item => ({
                    ...item,
                    // Ensure all required fields are present
                    id: item.id,
                    name: item.name,
                    title: item.name, // For compatibility
                    price: Number(item.price || 0),
                    quantity: item.quantity,
                    image_url: item.image,
                    image: item.image,
                    quotation_id: item.quotation_id,
                    quotation_code: item.quotation_code,
                    transport_cost: item.transport_cost || 0,
                    custom_work_cost: item.custom_work_cost || 0
                }));
                console.log('OrderSummaryPage: Merged quotation cart products:', merged);
                setCartProducts(merged);
                return;
            }
            
            // For regular products, fetch from products table
            const ids = cart.map(item => item.id);
            console.log('OrderSummaryPage: Fetching products with IDs:', ids);
            const { data, error } = await supabase.from('products').select('*').in('id', ids);
            if (!error && data) {
                console.log('OrderSummaryPage: Fetched products from database:', data);
                // Merge cart quantities with product details, but preserve quotation prices
                const merged = cart.map(item => {
                    const product = data.find((p: any) => p.id === item.id);
                    if (product) {
                        // If this is a quotation-based item, calculate the total price for this item
                        if (item.quotation_id) {
                            // Use the price from the cart item (which is the calculated quotation price)
                            return { 
                                ...product, 
                                quantity: item.quantity,
                                price: Number(item.price || 0), // Use the quotation price as the main price
                                original_price: product.price, // Keep original product price for reference
                                quotation_id: item.quotation_id,
                                quotation_code: item.quotation_code,
                                transport_cost: item.transport_cost || 0,
                                custom_work_cost: item.custom_work_cost || 0
                            };
                        } else {
                            // For regular items, use product price
                            return { ...product, quantity: item.quantity };
                        }
                    }
                    return item;
                });
                console.log('OrderSummaryPage: Final merged cart products:', merged);
                setCartProducts(merged);
            } else {
                console.error('OrderSummaryPage: Error fetching products:', error);
            }
        };
        fetchCartProducts();
    }, [cart]);

    // Fetch all products for quotation item processing
    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*');
            
            if (!error && data) {
                const productsMap: {[key: string]: any} = {};
                data.forEach(product => {
                    productsMap[product.id] = product;
                });
                setProducts(productsMap);
            }
        };
        
        fetchProducts();
    }, []);

    // Debug useEffect to monitor success dialog state
    useEffect(() => {
        console.log('showOrderSuccess state changed to:', showOrderSuccess);
    }, [showOrderSuccess]);
    
    // Debug useEffect to monitor cartProducts changes
    useEffect(() => {
        console.log('OrderSummaryPage: cartProducts changed:', cartProducts);
        console.log('OrderSummaryPage: cartProducts length:', cartProducts.length);
    }, [cartProducts]);

    const subtotal = cartProducts.reduce((sum, item) => {
        console.log('OrderSummaryPage: Calculating subtotal for item:', item);
        // For quotation-based items, use the calculated price (already includes quantity)
        if (item.quotation_id) {
            const itemTotal = Number(item.price || 0);
            console.log('OrderSummaryPage: Quotation item total:', itemTotal);
            return sum + itemTotal;
        }
        // For regular items, use the product price
        const itemTotal = (Number(item.price) || 0) * item.quantity;
        console.log('OrderSummaryPage: Regular item total:', itemTotal);
        return sum + itemTotal;
    }, 0);
    
    console.log('OrderSummaryPage: Final subtotal:', subtotal);
    
    // Check if this is a quotation-based order
    const hasQuotation = cartProducts.some((item: any) => item.quotation_id);
    
    const packaging = cartProducts.reduce((sum, item) => sum + ((Number(item.packagingFee) || 0) * item.quantity), 0);
    const total = subtotal + packaging;

    const handleSaveAddress = () => {
        if (editingAddressIdx !== null) {
            const updated = addresses.map((addr, idx) => idx === editingAddressIdx ? { ...newAddress } : addr);
            setAddresses(updated);
            setSelectedAddressIdx(editingAddressIdx);
            setEditingAddressIdx(null);
        } else {
            setAddresses(prev => [...prev, { ...newAddress }]);
            setSelectedAddressIdx(addresses.length);
        }
        setShowAddAddressForm(false);
    };

    const handleDeleteAddress = idx => {
        const updated = addresses.filter((_, i) => i !== idx);
        setAddresses(updated);
        if (selectedAddressIdx === idx) {
            setSelectedAddressIdx(updated.length ? 0 : null);
        } else if (selectedAddressIdx && selectedAddressIdx > idx) {
            setSelectedAddressIdx(selectedAddressIdx - 1);
        }
    };


    const handleOrderPlacement = async () => {
        // Strict user authentication check - no fallback
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            alert('Please log in to place an order.');
            return;
        }
        
        console.log('User authenticated:', user.email);
        console.log('User ID:', user.id);
        console.log('Starting order placement...');
        console.log('Cart products:', cartProducts);
        
        // Check if this order is from a quotation
        const hasQuotation = cartProducts.some(item => item.quotation_code);
        const quotationCode = hasQuotation ? cartProducts[0].quotation_code : null;
        const quotationId = hasQuotation ? cartProducts[0].quotation_id : null;
        
        console.log('Has quotation:', hasQuotation);
        console.log('Quotation Code:', quotationCode);
        console.log('Quotation ID:', quotationId);
        
        // Group cart items by merchant for parent-child order structure
        const merchantGroups: { [merchantCode: string]: any[] } = {};
        
        cartProducts.forEach(item => {
            const merchantCode = item.selected_merchant || item.merchant_code || 'admin';
            if (!merchantGroups[merchantCode]) {
                merchantGroups[merchantCode] = [];
            }
            merchantGroups[merchantCode].push(item);
        });
        
        console.log('Merchant groups:', merchantGroups);
        
        // Calculate total amount for parent order (sum of all child subtotals)
        const totalChildSubtotals = Object.entries(merchantGroups).reduce((sum, [merchantCode, items]) => {
            const merchantSubtotal = items.reduce((itemSum, item) => {
                if (item.quotation_id) {
                    return itemSum + Number(item.price || 0);
                }
                return itemSum + (Number(item.price || 0) * item.quantity);
            }, 0);
            return sum + merchantSubtotal;
        }, 0);
        
        // Use the appropriate order creation function based on order type
        let orderResult, orderError;
        
        if (hasQuotation) {
            // Use quotation-specific function for quotation-based orders
            // Group selected merchants from cart products and convert to array format
            const merchantGroups = cartProducts.reduce((acc, item) => {
                const merchantCode = item.selected_merchant || 'admin';
                if (!acc[merchantCode]) {
                    acc[merchantCode] = {
                        merchant_code: merchantCode,
                        items: [],
                        total_price: 0
                    };
                }
                acc[merchantCode].items.push({
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.price
                });
                acc[merchantCode].total_price += Number(item.price || 0);
                return acc;
            }, {} as { [key: string]: any });

            // Convert to array format expected by the function
            const selectedMerchants = Object.values(merchantGroups);

            console.log('Selected merchants data:', selectedMerchants);
            console.log('Delivery address:', deliveryAddress);
            console.log('Quotation code:', quotationCode);

            const result = await supabase
                .rpc('create_or_update_order_from_quotations', {
                    p_user_id: user.id,
                    p_quotation_code: quotationCode,
                    p_selected_merchants: selectedMerchants,
                    p_delivery_address: deliveryAddress || {},
                    p_shipping_address: deliveryAddress ? 
                        `${deliveryAddress.address}, ${deliveryAddress.city}, ${deliveryAddress.district} - ${deliveryAddress.pincode}` : 
                        ''
                });
            orderResult = result.data;
            orderError = result.error;
        } else {
            // Use regular order function for non-quotation orders
            // Get merchant code from quotation if available
            let merchantCode = 'admin';
            if (quotationCode) {
                try {
                    const { data: quotationData } = await supabase
                        .from('quotations')
                        .select('merchant_code')
                        .eq('quotation_code', quotationCode)
                        .single();
                    if (quotationData?.merchant_code) {
                        merchantCode = quotationData.merchant_code;
                    }
                } catch (error) {
                    console.log('Could not fetch merchant code from quotation, using default');
                }
            }
            
            const result = await supabase
                .rpc('create_or_update_simple_order', {
                p_user_id: user.id,
                p_delivery_address: deliveryAddress || {},
                p_cart_items: cartProducts || [],
                p_total_amount: totalChildSubtotals,
                p_quotation_code: quotationCode,
                p_merchant_code: merchantCode
            });
            orderResult = result.data;
            orderError = result.error;
        }

        if (orderError) {
            console.error('Order placement error:', orderError);
            // If quotation function fails, try regular order function as fallback
            if (hasQuotation) {
                console.log('Quotation function failed, trying regular order function...');
                const fallbackResult = await supabase
                    .rpc('create_or_update_simple_order', {
                        p_user_id: user.id,
                        p_delivery_address: deliveryAddress || {},
                        p_cart_items: cartProducts || [],
                        p_total_amount: totalChildSubtotals,
                        p_quotation_code: quotationCode,
                        p_merchant_code: merchantCode
                    });
                
                if (fallbackResult.error) {
                    console.error('Fallback order placement error:', fallbackResult.error);
                    alert('Order placement failed: ' + fallbackResult.error.message);
                    return;
                }
                
                orderResult = fallbackResult.data;
                orderError = null;
            } else {
            alert('Order placement failed: ' + orderError.message);
            return;
            }
        }

        if (orderResult && !orderResult.success) {
            console.error('Order placement failed:', orderResult.message);
            alert('Order placement failed: ' + orderResult.message);
            return;
        }

        console.log('Order placed successfully:', orderResult);
        
        // If this order is from a quotation, update the quotation status to user_confirmed
        if (quotationId) {
            const { error: quotationError } = await supabase
                .from('quotations')
                .update({ status: 'user_confirmed' })
                .eq('id', quotationId);
                
            if (quotationError) {
                console.error('Failed to update quotation status:', quotationError);
                // Continue with order success even if quotation update fails
            } else {
                console.log('Quotation status updated to user_confirmed');
            }
        }
        
        console.log('Order placement completed successfully');
        console.log('Order result:', orderResult);
        
        // Show success message
        const orderCode = orderResult?.order_codes?.[0] || orderResult?.order_code || orderResult?.id || 'Order placed';
        const description = orderResult?.order_codes && orderResult.order_codes.length > 1 ? 
            `Orders: ${orderResult.order_codes.join(', ')} - Split across ${orderResult.merchant_count} merchants` : 
            `Order: ${orderCode} placed successfully`;
            
        toast({
            title: "Order Placed Successfully!",
            description: description,
            variant: "default"
        });
        
        // Clear cart and show success dialog
        setShowOrderSuccess(true);
        setCart([]);
        localStorage.removeItem('cart');
        clearCart();
        
        console.log('Success actions completed - cart cleared, success dialog shown');
    };

    const handlePlaceOrderClick = async () => {
        // Double-check user authentication
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
            alert('Please log in to place an order.');
            return;
        }
        
        if (!deliveryAddress || !deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.pincode) {
            alert('Please add a complete delivery address before placing your order.');
            return;
        }
        
        if (cartProducts.length === 0) {
            alert('Your order summary is empty. Please add items to your cart before placing your order.');
            return;
        }
        
        // Show loading state
        setPlacingOrder(true);
        
        try {
            // Place the order
            await handleOrderPlacement();
        } catch (error) {
            console.error('Order placement failed:', error);
            toast({
                title: "Order Failed",
                description: "Failed to place order. Please try again.",
                variant: "destructive"
            });
        } finally {
            setPlacingOrder(false);
        }
    };

    // Handler to clear cart and go to orders page (for both close and button)
    const handleOrderSuccessClose = () => {
        console.log('Closing success dialog and navigating to orders...');
        setShowOrderSuccess(false);
        setCart([]);
        localStorage.removeItem('cart');
        clearCart();
        navigate('/orders');
    };

    return (
        <>
            <Navbar />
            <div className="bg-gray-50 min-h-screen py-4 px-2 sm:px-0">
                <div className={`max-w-5xl mx-auto`}>
                    {/* Main content: left (order summary) and right (price details) */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-4">
                            {/* Quotation Banner - Show if order is from quotation */}
                            {cartProducts.some((item: any) => item.quotation_id) && (
                                <Card className="border-emerald-200 bg-emerald-50">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">✓</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-emerald-800">Quotation-Based Order</h3>
                                                <p className="text-sm text-emerald-600">
                                                    You're placing an order from your approved quotation. 
                                                    The price has been approved by our admin team.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* LOGIN INFO */}
                            <Card>
                                <CardContent className="p-0">
                                    <div className="bg-emerald-600 text-emerald-50 px-4 py-2 font-bold text-lg flex items-center cursor-pointer" onClick={() => !user && setShowLoginForm(v => !v)}>
                                        <span className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-emerald-600 bg-white text-emerald-600 font-bold">1</span>
                                            LOGIN OR SIGNUP {user && <span className="ml-2 text-lg">✓</span>}
                                        </span>
                                    </div>
                                    <div className="p-4 flex flex-col md:flex-row gap-6 items-start">
                                        <div className="flex-1 min-w-[220px]">
                                            {showLoginForm ? (
                                                <form className="space-y-4" onSubmit={async e => {
                                                    e.preventDefault();
                                                    setLoginError('');
                                                    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
                                                    if (error) {
                                                        setLoginError(error.message || 'Login failed');
                                                    } else if (data.user) {
                                                        setUser(data.user);
                                                        setShowLoginForm(false);
                                                        setLoginEmail('');
                                                        setLoginPassword('');
                                                    }
                                                }}>
                                                    <Input
                                                        type="email"
                                                        placeholder="Enter Email"
                                                        value={loginEmail}
                                                        onChange={e => setLoginEmail(e.target.value)}
                                                        required
                                                    />
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter Password"
                                                        value={loginPassword}
                                                        onChange={e => setLoginPassword(e.target.value)}
                                                        required
                                                    />
                                                    {loginError && <div className="text-red-600 text-sm">{loginError}</div>}
                                                    <Button type="submit" size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">Continue</Button>
                                                    <Button type="button" size="sm" variant="outline" className="w-full mt-2" onClick={() => setShowLoginForm(false)}>Cancel</Button>
                                                    <div className="text-center text-sm mt-2">
                                                        Don't have an account? <span className="text-blue-600 cursor-pointer" onClick={() => {/* handle register navigation */ }}>Register</span>
                                                    </div>
                                                </form>
                                            ) : user ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="font-semibold text-lg">{user.email}</div>
                                                    <Button variant="outline" size="sm" onClick={() => setShowLoginForm(true)}>Change</Button>
                                                </div>
                                            ) : (
                                                <div className="text-gray-600 text-sm">Click above to login or signup</div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            {/* DELIVERY ADDRESS */}
                            <Card>
                                <CardContent className="p-0 flex flex-col gap-4">
                                    <div className="bg-emerald-600 text-emerald-50 px-4 py-2 font-bold text-lg flex items-center">2 DELIVERY ADDRESS</div>
                                    <div className="p-4">
                                        {addresses.length > 0 && selectedAddressIdx !== null ? (
                                            <div className="border rounded p-3 mb-2 bg-emerald-50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold">{addresses[selectedAddressIdx].name} <span className="text-gray-600">{addresses[selectedAddressIdx].phone}</span></div>
                                                        <div className="text-gray-700 text-sm">
                                                            {addresses[selectedAddressIdx].address}, {addresses[selectedAddressIdx].city}, {addresses[selectedAddressIdx].state} – {addresses[selectedAddressIdx].pincode}
                                                        </div>
                                                        <div className="text-xs mt-1"><span className="px-2 py-1 rounded bg-emerald-200 text-emerald-800">{addresses[selectedAddressIdx].addressType}</span></div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 ml-4">
                                                        <span className="ml-4 text-emerald-600 font-bold">Selected</span>
                                                        <Button size="sm" variant="outline" onClick={() => {
                                                            setNewAddress({
                                                                name: addresses[selectedAddressIdx].name,
                                                                phone: addresses[selectedAddressIdx].phone,
                                                                addressLine: addresses[selectedAddressIdx].address,
                                                                city: addresses[selectedAddressIdx].city,
                                                                state: addresses[selectedAddressIdx].state,
                                                                pincode: addresses[selectedAddressIdx].pincode,
                                                                addressType: addresses[selectedAddressIdx].addressType
                                                            });
                                                            setEditingAddressIdx(selectedAddressIdx);
                                                            setShowAddAddressForm(true);
                                                        }}>Edit</Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
                                                            // Remove address from array
                                                            const newAddresses = addresses.filter((_, idx) => idx !== selectedAddressIdx);
                                                            setAddresses(newAddresses);
                                                            setSelectedAddressIdx(newAddresses.length > 0 ? 0 : null);
                                                            // Clear delivery address if the selected address was deleted
                                                            if (selectedAddressIdx === 0 && newAddresses.length === 0) {
                                                                setDeliveryAddress(null);
                                                            }
                                                        }}>Delete</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : addresses.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600 mb-2">Select a delivery address:</p>
                                                {addresses.map((address, index) => (
                                                    <div key={index} className="border rounded p-3 cursor-pointer hover:bg-gray-50" onClick={() => {
                                                        setSelectedAddressIdx(index);
                                                        setDeliveryAddress(address);
                                                    }}>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-semibold">{address.name} <span className="text-gray-600">{address.phone}</span></div>
                                                                <div className="text-gray-700 text-sm">
                                                                    {address.address}, {address.city}, {address.state} – {address.pincode}
                                                                </div>
                                                                <div className="text-xs mt-1"><span className="px-2 py-1 rounded bg-gray-200 text-gray-800">{address.addressType}</span></div>
                                                            </div>
                                                            <Button size="sm" variant="outline" onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewAddress({
                                                                    name: address.name,
                                                                    phone: address.phone,
                                                                    addressLine: address.address,
                                                                    city: address.city,
                                                                    state: address.state,
                                                                    pincode: address.pincode,
                                                                    addressType: address.addressType
                                                                });
                                                                setEditingAddressIdx(index);
                                                                setShowAddAddressForm(true);
                                                            }}>Edit</Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-fit mt-2"
                                                    onClick={() => setShowAddAddressForm(v => !v)}
                                                >
                                                    + Add New Address
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-fit"
                                                onClick={() => setShowAddAddressForm(v => !v)}
                                            >
                                                + Add New Address
                                            </Button>
                                        )}
                                        {showAddAddressForm && (
                                            <form className="bg-white border rounded p-4 mt-2 space-y-3 w-full max-w-xl" onSubmit={async (e) => {
                                                e.preventDefault();
                                                
                                                // Update addresses array
                                                const updatedAddresses = [...addresses];
                                                if (editingAddressIdx !== null) {
                                                    // Editing existing address
                                                    updatedAddresses[editingAddressIdx] = { ...newAddress };
                                                } else {
                                                    // Adding new address
                                                    updatedAddresses.push({ ...newAddress });
                                                }
                                                setAddresses(updatedAddresses);
                                                
                                                // Set as selected address and delivery address if it's the first address or if editing the currently selected one
                                                if (updatedAddresses.length === 1 || editingAddressIdx === selectedAddressIdx) {
                                                    setSelectedAddressIdx(updatedAddresses.length - 1);
                                                    setDeliveryAddress(newAddress);
                                                }
                                                
                                                // Save to database if user is logged in
                                                if (user) {
                                                    try {
                                                        const addressData = {
                                                            address: newAddress.addressLine,
                                                            city: newAddress.city,
                                                            district: newAddress.state,
                                                            pincode: newAddress.pincode
                                                        };
                                                        
                                                        const { error } = await supabase
                                                            .from('user_profiles')
                                                            .update({ 
                                                                address: JSON.stringify(addressData),
                                                                first_name: newAddress.name.split(' ')[0],
                                                                last_name: newAddress.name.split(' ').slice(1).join(' '),
                                                                phone: newAddress.phone
                                                            })
                                                            .eq('id', user.id);
                                                        
                                                        if (error) {
                                                            console.error('Error saving address to database:', error);
                                                            toast({
                                                                title: "Error",
                                                                description: "Failed to save address. Please try again.",
                                                                variant: "destructive"
                                                            });
                                                        } else {
                                                            toast({
                                                                title: "Address Saved",
                                                                description: "Your address has been saved successfully.",
                                                            });
                                                        }
                                                    } catch (error) {
                                                        console.error('Error saving address:', error);
                                                    }
                                                }
                                                
                                                setShowAddAddressForm(false);
                                                setEditingAddressIdx(null);
                                            }}>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <Input placeholder="Name" value={newAddress.name} onChange={e => setNewAddress(f => ({ ...f, name: e.target.value }))} required />
                                                    <Input placeholder="Mobile Number" value={newAddress.phone} onChange={e => setNewAddress(f => ({ ...f, phone: e.target.value }))} required />
                                                    <Input placeholder="Address Line" value={newAddress.addressLine} onChange={e => setNewAddress(f => ({ ...f, addressLine: e.target.value }))} required />
                                                    <Input placeholder="City" value={newAddress.city} onChange={e => setNewAddress(f => ({ ...f, city: e.target.value }))} required />
                                                    <Input placeholder="State" value={newAddress.state} onChange={e => setNewAddress(f => ({ ...f, state: e.target.value }))} required />
                                                    <Input placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress(f => ({ ...f, pincode: e.target.value }))} required />
                                                </div>
                                                <div className="flex gap-4 items-center mt-2">
                                                    <span className="text-sm font-medium">Address Type:</span>
                                                    <label className="flex items-center gap-1 text-sm">
                                                        <input type="radio" name="addressType" value="Home" checked={newAddress.addressType === 'Home'} onChange={() => setNewAddress(f => ({ ...f, addressType: 'Home' }))} /> Home
                                                    </label>
                                                    <label className="flex items-center gap-1 text-sm">
                                                        <input type="radio" name="addressType" value="Work" checked={newAddress.addressType === 'Work'} onChange={() => setNewAddress(f => ({ ...f, addressType: 'Work' }))} /> Work
                                                    </label>
                                                </div>
                                                <div className="flex gap-3 mt-4">
                                                    <Button type="submit" className="bg-emerald-600 text-white">Save and Deliver Here</Button>
                                                    <Button type="button" variant="outline" onClick={() => setShowAddAddressForm(false)}>Cancel</Button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            {/* ORDER SUMMARY */}
                            <Card>
                                <CardContent className="p-0">
                                    <div className="bg-emerald-600 text-emerald-50 px-4 py-2 font-bold text-lg flex items-center">3 ORDER SUMMARY</div>
                                    <div className="p-4">
                                        {cartProducts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8">
                                                <div className="text-lg font-semibold text-gray-600 mb-4">Your order summary is empty.</div>
                                                <Button className="bg-emerald-600 text-white px-6 py-2 rounded-lg" onClick={() => navigate('/shop')}>
                                                    Go to Shop & Add Items
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {cartProducts.map((item, index) => (
                                                    <div key={`${item.id}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                                        {/* Plant Header */}
                                                        <div className="flex items-start gap-4 mb-4">
                                                    <img
                                                        src={
                                                            item.image_url && typeof item.image_url === 'string' && (item.image_url.startsWith('http') || item.image_url.startsWith('/assets/'))
                                                                ? item.image_url
                                                                : (item.image && typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/assets/'))
                                                                    ? item.image
                                                                    : '/assets/placeholder.svg')
                                                        }
                                                        alt={item.title || item.name}
                                                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                                        onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                                    />
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title || item.name}</h3>
                                                                
                                                                {/* Merchant Information */}
                                                                {item.selected_merchant && (
                                                                    <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                                            <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium text-blue-800">Merchant:</span>
                                                                            <Badge className="bg-blue-100 text-blue-800 font-mono text-xs">
                                                                                {item.selected_merchant}
                                                                            </Badge>
                                                                            {item.merchant_name && (
                                                                                <span className="text-sm text-blue-700">({item.merchant_name})</span>
                                                                            )}
                                                                        </div>
                                                                        {item.estimated_delivery_days && (
                                                                            <div className="text-xs text-blue-600 mt-1">
                                                                                Estimated Delivery: {item.estimated_delivery_days} days
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

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
                                                                    ₹{item.quotation_id ? Number(item.price || 0).toFixed(2) : (Number(item.price || 0) * item.quantity).toFixed(2)}
                                                                            </div>
                                                                {item.quotation_id && (
                                                                                <div className="flex items-center gap-2">
                                                                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                                                        Quotation Price
                                                                    </Badge>
                                                                                    <span className="text-xs text-gray-500">
                                                                        (₹{(Number(item.price || 0) / (item.quantity || 1)).toFixed(2)} × {item.quantity} = ₹{Number(item.price || 0).toFixed(2)})
                                                                    </span>
                                                                                </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                                    
                                                                    {/* Quotation Information */}
                                                                    {item.quotation_code && (
                                                                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-medium text-green-800">Quotation Code:</span>
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
                                                ))}
                                                
                                                {/* Merchant Breakdown */}
                                                <div className="border-t border-gray-200 pt-4">
                                                    <h4 className="font-semibold text-gray-900 mb-3">Order Breakdown by Merchant</h4>
                                                    <div className="space-y-3">
                                                        {Object.entries(
                                                            cartProducts.reduce((acc, item) => {
                                                                const merchant = item.selected_merchant || 'Unknown Merchant';
                                                                if (!acc[merchant]) {
                                                                    acc[merchant] = [];
                                                                }
                                                                acc[merchant].push(item);
                                                                return acc;
                                                            }, {} as { [key: string]: any[] })
                                                        ).map(([merchantCode, items]) => {
                                                            const merchantTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
                                                            return (
                                                                <div key={merchantCode} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge className="bg-blue-100 text-blue-800 font-mono text-xs">
                                                                                {merchantCode}
                                                                            </Badge>
                                                                            <span className="text-sm text-gray-600">
                                                                                {items.length} item(s)
                                                                            </span>
                                                                        </div>
                                                                        <span className="font-semibold text-gray-900">
                                                                            ₹{merchantTotal.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    <div className="mt-4 text-sm text-gray-600 text-center">
                                                        Total {cartProducts.length} item(s) from {new Set(cartProducts.map(item => item.selected_merchant)).size} merchant(s)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        {/* PRICE DETAILS & SAVINGS - right side on desktop, top on mobile */}
                        <div className="md:w-80 w-full flex-shrink-0">
                            <Card className="mb-4">
                                <CardContent className="p-4">
                                    <div className="font-bold text-gray-700 mb-2">PRICE DETAILS</div>
                                    {cartProducts.some((item: any) => item.quotation_id) && (
                                        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                                            <div className="text-emerald-800 font-semibold">✓ Quotation-Based Order</div>
                                            <div className="text-emerald-600 text-xs">
                                                Price approved by admin: {cartProducts[0]?.quotation_code}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm mb-1"><span>Price ({cartProducts.length} item{cartProducts.length > 1 ? 's' : ''})</span><span>₹{subtotal}</span></div>

                                    <div className="flex justify-between text-sm mb-1"><span>Packaging Charge</span><span>₹{packaging}</span></div>
                                    <div className="border-t my-2"></div>
                                    <div className="flex justify-between text-lg font-bold mb-2"><span>Total Payable</span><span>₹{total}</span></div>
                                    <Button 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold py-3 mt-2" 
                                        onClick={handlePlaceOrderClick}
                                        disabled={placingOrder}
                                    >
                                        {placingOrder ? (
                                            <>
                                                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Placing Order...
                                            </>
                                        ) : (
                                            'Place Order'
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    {/* Mobile: show trust badges below everything */}
                    <div className="md:hidden flex flex-col justify-center items-center text-center text-gray-600 text-sm gap-2 mt-4">
                        {/* Trust badges section removed */}
                    </div>
                    {/* Back to Shop Button */}
                    <div className="hidden md:flex justify-center mt-8 mb-4">
                        <Button className="bg-emerald-600 text-white px-6 py-3 text-lg font-semibold rounded-lg shadow hover:bg-emerald-700" onClick={() => navigate('/shop')}>
                            Back to Shop
                        </Button>
                    </div>
                </div>
            </div>
            <Dialog open={showOrderSuccess} onOpenChange={open => { 
                console.log('Dialog onOpenChange called with:', open);
                if (!open) handleOrderSuccessClose(); 
            }}>
                <DialogContent className="max-w-lg p-8 text-center flex flex-col items-center">
                    <FlyingEnvelope />
                    <AnimatedTick />
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-bold text-emerald-700 mb-4">Order Placed Successfully!</DialogTitle>
                        <DialogDescription className="sr-only">
                            Order confirmation dialog showing successful order placement
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-lg text-gray-700 mb-6">Your order has been placed successfully! You can view your order details in the Orders page.</div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 text-lg rounded-lg" onClick={handleOrderSuccessClose}>
                        View My Orders
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OrderSummaryPage;