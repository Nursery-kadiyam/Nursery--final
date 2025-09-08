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


const mockSavings = 3471;

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
    const { clearCart } = useCart();
    const [cartProducts, setCartProducts] = useState<any[]>([]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUser(null);
                setAddresses([]);
            } else {
                setUser(user);
                setAddresses([{
                    name: user.user_metadata?.first_name,
                    address: "",
                    pincode: "",
                }]);
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
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        setCart(items);
        
        // Check if this is a quotation-based order
        const hasQuotation = items.some((item: any) => item.quotation_id);
        if (hasQuotation) {
            const quotationCode = items[0]?.quotation_code;
            toast({
                title: "Quotation Order",
                description: `You're placing an order from approved quotation ${quotationCode}`,
                variant: "default"
            });
        }
    }, []);

    useEffect(() => {
        const fetchCartProducts = async () => {
            if (!cart || cart.length === 0) {
                setCartProducts([]);
                return;
            }
            const ids = cart.map(item => item.id);
            const { data, error } = await supabase.from('products').select('*').in('id', ids);
            if (!error && data) {
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
                setCartProducts(merged);
            }
        };
        fetchCartProducts();
    }, [cart]);

    // Debug useEffect to monitor success dialog state
    useEffect(() => {
        console.log('showOrderSuccess state changed to:', showOrderSuccess);
    }, [showOrderSuccess]);

    const subtotal = cartProducts.reduce((sum, item) => {
        // For quotation-based items, use the calculated price (already includes quantity)
        if (item.quotation_id) {
            return sum + Number(item.price || 0);
        }
        // For regular items, use the product price
        return sum + ((Number(item.price) || 0) * item.quantity);
    }, 0);
    
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

    const handleAddDemoItem = () => {
        const newItem = {
            id: Date.now(),
            image: "https://rukminim2.flixcart.com/image/416/416/xif0q/shoe/2/0/0/10-rx4classic-10-bruton-black-original-imagz2y2gqzqzqzq.jpeg",
            title: "RX4CLASSIC Stylish and Trendy Design ,Sport Walkin...",
            description: "Size: 10, Black, 10",
            seller: "PKCO",
            originalPrice: 999,
            price: 443,
            discount: 55,
            coupon: "1 coupon applied",
            quantity: 1,
            deliveryInfo: "Delivery by Wed Jul 9"
        };
        setCart(prev => {
            const updated = [...prev, newItem];
            localStorage.setItem("cartItems", JSON.stringify(updated));
            return updated;
        });
    };

    const handleMockOrderPlacement = async () => {
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
        
        const orderPayload = {
            user_id: user.id,
            quotation_code: quotationCode, // Add quotation_code if this is a quotation order
            delivery_address: deliveryAddress || {},
            shipping_address: deliveryAddress ? JSON.stringify(deliveryAddress) : 'Default Address',
            total_amount: total,
            cart_items: cartProducts || [],
            status: 'pending'
        };
        
        console.log('Order payload:', orderPayload);
        
        // Insert order and get the new order's id
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select('id')
            .single();
            
        if (orderError) {
            console.error('Order save error:', orderError);
            alert('Order save failed: ' + orderError.message);
            return;
        }
        
        console.log('Order saved successfully. Order ID:', orderData.id);
        
        // Insert order_items for each cart item
        const orderId = orderData.id;
        const orderItems = cartProducts.map(item => ({
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            unit_price: item.unit_price || Math.round(item.price / item.quantity) // Use unit_price from quotation or calculate from total
        }));
        
        console.log('Order items to save:', orderItems);
        
        const { error: orderItemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
            
        if (orderItemsError) {
            console.error('Order items save error:', orderItemsError);
            alert('Order items save failed: ' + orderItemsError.message);
            return;
        }
        
        console.log('Order items saved successfully');
        
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
        
        // Show success message
        toast({
            title: "Order Placed Successfully!",
            description: `Order saved with ID: ${orderData.id}. Order items: ${orderItems.length}`,
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
        
        if (!deliveryAddress) {
            alert('Please add a delivery address before placing your order.');
            return;
        }
        
        if (cartProducts.length === 0) {
            alert('Your order summary is empty. Please add items to your cart before placing your order.');
            return;
        }
        
        // Direct call to order placement
        handleMockOrderPlacement();
    };

    // Handler to clear cart and go home (for both close and button)
    const handleOrderSuccessClose = () => {
        console.log('Closing success dialog and navigating home...');
        setShowOrderSuccess(false);
        setCart([]);
        localStorage.removeItem('cart');
        clearCart();
        navigate('/');
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
                                        {deliveryAddress ? (
                                            <div className="border rounded p-3 mb-2 bg-emerald-50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold">{deliveryAddress.name} <span className="text-gray-600">{deliveryAddress.phone}</span></div>
                                                        <div className="text-gray-700 text-sm">
                                                            {deliveryAddress.addressLine}, {deliveryAddress.city}, {deliveryAddress.state} – {deliveryAddress.pincode}
                                                        </div>
                                                        <div className="text-xs mt-1"><span className="px-2 py-1 rounded bg-emerald-200 text-emerald-800">{deliveryAddress.addressType}</span></div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 ml-4">
                                                        <span className="ml-4 text-emerald-600 font-bold">Selected</span>
                                                        <Button size="sm" variant="outline" onClick={() => {
                                                            setNewAddress(deliveryAddress);
                                                            setShowAddAddressForm(true);
                                                        }}>Edit</Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
                                                            localStorage.removeItem('deliveryAddress');
                                                            setDeliveryAddress(null);
                                                        }}>Delete</Button>
                                                    </div>
                                                </div>
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
                                            <form className="bg-white border rounded p-4 mt-2 space-y-3 w-full max-w-xl" onSubmit={e => {
                                                e.preventDefault();
                                                setDeliveryAddress({ ...newAddress });
                                                localStorage.setItem('deliveryAddress', JSON.stringify({ ...newAddress }));
                                                setShowAddAddressForm(false);
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
                                            cartProducts.map(item => (
                                                <div key={item.id} className="flex flex-row sm:flex-row gap-4 border-b pb-4 mb-4 bg-white rounded shadow-sm">
                                                    <img
                                                        src={
                                                            item.image_url && typeof item.image_url === 'string' && (item.image_url.startsWith('http') || item.image_url.startsWith('/assets/'))
                                                                ? item.image_url
                                                                : (item.image && typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/assets/'))
                                                                    ? item.image
                                                                    : '/assets/placeholder.svg')
                                                        }
                                                        alt={item.title || item.name}
                                                        className="w-24 h-24 object-cover rounded"
                                                        onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                                    />
                                                    <div className="flex-1 flex flex-col justify-between">
                                                        <div className="flex flex-col">
                                                            <div className="font-semibold text-base sm:text-lg">{item.title || item.name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-base sm:text-lg text-green-700">
                                                                    ₹{item.quotation_id ? Number(item.price || 0).toFixed(2) : (Number(item.price || 0) * item.quantity).toFixed(2)}
                                                                </span>
                                                                {item.quotation_id && (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                                                        Quotation Price
                                                                    </Badge>
                                                                )}
                                                                {item.quotation_id ? (
                                                                    <span className="text-sm text-gray-500">
                                                                        (₹{(Number(item.price || 0) / (item.quantity || 1)).toFixed(2)} × {item.quantity} = ₹{Number(item.price || 0).toFixed(2)})
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm text-gray-500">
                                                                        (₹{Number(item.price || 0).toFixed(2)} × {item.quantity} = ₹{(Number(item.price || 0) * item.quantity).toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-600 mb-1">{item.description}</div>
                                                        {item.seller && <div className="text-xs text-gray-600 mb-1">Seller: <span className="font-medium">{item.seller}</span></div>}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {item.originalPrice && <span className="line-through text-gray-400 text-sm">₹{item.originalPrice}</span>}
                                                            {item.discount && <span className="text-green-600 text-xs font-semibold">{item.discount}% Off</span>}
                                                            {item.coupon && <span className="text-green-700 text-xs font-semibold">{item.coupon}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-sm text-gray-600">Quantity: {item.quantity}</span>
                                                        </div>
                                                        {item.deliveryInfo && <div className="text-xs text-gray-500 mt-1">{item.deliveryInfo}</div>}
                                                    </div>
                                                </div>
                                            ))
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
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold py-3 mt-2" onClick={handlePlaceOrderClick}>Place Order</Button>
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
                    <div className="text-lg text-gray-700 mb-6">Your order will be delivered within 5 to 7 days.</div>
                    <Button className="bg-gold-600 hover:bg-gold-700 text-white font-bold px-8 py-3 text-lg rounded-lg" onClick={handleOrderSuccessClose}>
                        Close
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OrderSummaryPage;