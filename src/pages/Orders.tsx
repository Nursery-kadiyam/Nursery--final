import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getInitials(profile) {
    if (!profile) return "?";
    const first = profile.first_name ? profile.first_name[0] : "";
    const last = profile.last_name ? profile.last_name[0] : "";
    return (first + last).toUpperCase() || "?";
}

const Orders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Profile and Wishlist state
    const [profile, setProfile] = useState<any>(null);
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [wishlistLoading, setWishlistLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setProfileLoading(true);
            setWishlistLoading(true);
            setError(null);
            // Get logged-in user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setOrders([]);
                setProfile(null);
                setWishlist([]);
                setLoading(false);
                setProfileLoading(false);
                setWishlistLoading(false);
                return;
            }
            // Fetch profile
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from("user_profiles")
                    .select("first_name, last_name, email, phone")
                    .eq("id", user.id)
                    .single();
                if (profileError) throw profileError;
                setProfile(profileData);
            } catch (err) {
                setProfile(null);
            }
            setProfileLoading(false);
            // Fetch wishlist
            try {
                const { data: wishlistData, error: wishlistError } = await supabase
                    .from("wishlist")
                    .select("id, product_id, products:product_id(id, name, image_url, price)")
                    .eq("user_id", user.id);
                if (wishlistError) throw wishlistError;
                setWishlist(wishlistData || []);
            } catch (err) {
                setWishlist([]);
            }
            setWishlistLoading(false);
            // Fetch orders (existing logic)
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select(`id, order_code, total_amount, cart_items, created_at, status, delivery_address, order_items:order_items(id, quantity, price, product:product_id(id, name, image_url))`)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                // Format orders for display
                const formattedOrders = (data || []).map(order => {
                    // Priority for calculating total:
                    // 1. Use total_amount from database if available
                    // 2. Calculate from cart_items if available (has quotation prices)
                    // 3. Calculate from order_items as fallback
                    
                    let calculatedTotal = 0;
                    
                    if (order.cart_items && Array.isArray(order.cart_items)) {
                        // Check if this is a quotation-based order
                        const hasQuotationData = order.cart_items.some(item => 
                            item.quotation_id || item.quotation_price || item.transport_cost || item.custom_work_cost
                        );
                        
                        if (hasQuotationData) {
                            // For quotation orders: use quotation price + transport + custom costs
                            let itemsTotal = 0;
                            let transportTotal = 0;
                            let customWorkTotal = 0;
                            
                            order.cart_items.forEach(item => {
                                // Use quotation price (which is total price for this item, not per unit)
                                const quotationPrice = item.quotation_price || item.price || 0;
                                itemsTotal += quotationPrice;
                                
                                // Add transport and custom costs (these are typically per order, not per item)
                                if (item.transport_cost) transportTotal += item.transport_cost;
                                if (item.custom_work_cost) customWorkTotal += item.custom_work_cost;
                                
                                console.log(`Quotation item processing:`, {
                                    name: item.name,
                                    quantity: item.quantity,
                                    original_price: item.price,
                                    quotation_price: item.quotation_price,
                                    transport_cost: item.transport_cost || 0,
                                    custom_work_cost: item.custom_work_cost || 0,
                                    calculated_quotation_price: quotationPrice
                                });
                            });
                            
                            calculatedTotal = itemsTotal + transportTotal + customWorkTotal;
                            console.log(`Quotation calculation - Items: ${itemsTotal}, Transport: ${transportTotal}, Custom: ${customWorkTotal}, Total: ${calculatedTotal}`);
                        } else {
                            // For regular orders: use quantity × price
                            calculatedTotal = order.cart_items.reduce((sum, item) => {
                                const itemPrice = item.price || 0;
                                const itemQuantity = item.quantity || 1;
                                console.log(`Regular item: ${item.name}, price: ${itemPrice}, quantity: ${itemQuantity}`);
                                return sum + (itemQuantity * itemPrice);
                            }, 0);
                            console.log(`Regular calculation: ${calculatedTotal}`);
                        }
                    } else {
                        // Fallback to order_items
                        calculatedTotal = (order.order_items || []).reduce((sum, item) => {
                            const itemPrice = item.price || 0;
                            const itemQuantity = item.quantity || 1;
                            console.log(`Order item price: ${itemPrice}, quantity: ${itemQuantity}`);
                            return sum + (itemQuantity * itemPrice);
                        }, 0);
                        console.log(`Calculated from order_items: ${calculatedTotal}`);
                    }
                    
                    const totalAmount = order.total_amount || calculatedTotal;
                    console.log(`Final total for order ${order.id}: ${totalAmount}`);
                    
                                        const isQuotationOrder = order.cart_items && Array.isArray(order.cart_items) && 
                        order.cart_items.some(item => item.quotation_id || item.quotation_price || item.transport_cost || item.custom_work_cost);
                    
                    return {
                    id: order.id,
                        order_code: order.order_code,
                    date: order.created_at,
                    status: order.status,
                                            address: order.delivery_address,
                        total_amount: totalAmount,
                        cart_items: order.cart_items,
                        is_quotation_order: isQuotationOrder,
                                            items: isQuotationOrder && order.cart_items ? 
                            // For quotation orders, use cart_items with quotation prices
                            order.cart_items.map(item => {
                                // For quotation orders, the quotation_price is the total price for the item
                                // We need to calculate the unit price by dividing quotation_price by quantity
                                const quotationPrice = item.quotation_price || item.price || 0;
                                const unitPrice = quotationPrice / (item.quantity || 1);
                                
                                console.log(`Quotation item mapping:`, {
                                    name: item.name || item.title,
                                    quantity: item.quantity || 1,
                                    original_price: item.price,
                                    quotation_price: item.quotation_price,
                                    calculated_unit_price: unitPrice,
                                    final_quotation_price: quotationPrice,
                                    calculation: `${item.quantity || 1} × ₹${unitPrice.toFixed(2)} = ₹${quotationPrice.toFixed(2)}`
                                });
                                
                                return {
                                    name: item.name || item.title,
                                    image: item.image || item.image_url,
                                    quantity: item.quantity || 1,
                                    // For quotation orders, calculate the unit price from quotation price and quantity
                                    price: unitPrice, // Calculate unit price from quotation total
                                    quotation_price: quotationPrice, // Ensure quotation_price is always available
                                    is_quotation: true
                                };
                            }) :
                            // For regular orders, use order_items
                            (order.order_items || []).map(item => {
                                const product = Array.isArray(item.product) ? item.product[0] : item.product;
                                return {
                                    name: product?.name,
                                    image: product?.image_url,
                                    quantity: item.quantity,
                                    price: item.price,
                                    is_quotation: false
                                };
                            })
                    };
                });
                setOrders(formattedOrders);
            } catch (err: any) {
                setError("Failed to fetch orders. Please try again later.");
                setOrders([]);
            }
            setLoading(false);
        };
        fetchAll();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Professional Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">NK</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            </div>
                        <div className="hidden sm:flex items-center space-x-4">
                            <span className="text-sm text-gray-500">Welcome back!</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Profile Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                                    {profileLoading ? '...' : getInitials(profile)}
                        </div>
                        {profileLoading ? (
                                    <div className="animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded mb-1"></div>
                                    </div>
                        ) : profile ? (
                            <>
                                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                            {profile.first_name} {profile.last_name}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-2">{profile.email}</p>
                                        <p className="text-gray-500 text-xs">{profile.phone || 'Phone not provided'}</p>
                            </>
                        ) : (
                                    <p className="text-gray-500">Profile not found</p>
                                )}
                            </div>
                            
                            {/* Order Summary */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Orders</span>
                                        <span className="font-medium">{orders.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Active Orders</span>
                                        <span className="font-medium text-emerald-600">
                                            {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Orders Main Content */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
                                    <div className="text-sm text-gray-500">
                                        {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-200">
                        {loading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Loading your orders...</p>
                                    </div>
                        ) : error ? (
                                    <div className="p-8 text-center">
                                        <div className="text-red-600 mb-2">⚠️ Error</div>
                                        <p className="text-gray-600">{error}</p>
                                    </div>
                        ) : orders.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="text-gray-400 text-4xl mb-4">📦</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                                        <p className="text-gray-500">When you place orders, they'll appear here.</p>
                                    </div>
                                ) : (
                                    orders.map(order => (
                                        <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            {/* Order Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                                    <div className="font-semibold text-gray-900">
                                                        #{order.order_code || order.id}
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {order.status || 'Processing'}
                                        </span>
                                    </div>
                                                <div className="flex flex-col sm:items-end">
                                                    <div className="text-lg font-bold text-emerald-600 mb-1">
                                                        ₹{order.total_amount ? order.total_amount.toFixed(2) : '0.00'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(order.date).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Items */}
                                            <div className="space-y-3 mb-4">
                                                <h4 className="font-medium text-gray-900 text-sm">Items Ordered</h4>
                                                <div className="grid gap-3">
                                                    {order.items.slice(0, 2).map((item, idx) => (
                                                        <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                            <img 
                                                                src={item.image && (item.image.startsWith('http') || item.image.startsWith('/assets/')) 
                                                                    ? item.image : '/assets/placeholder.svg'} 
                                                                alt={item.name} 
                                                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0" 
                                                                onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }} 
                                                            />
                                                                                                                    <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                                {item.is_quotation && (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                        Quotation
                                                                    </span>
                                                                )}
                                                            </div>
                                                                <p className="text-sm text-gray-600">
                                                                    {item.is_quotation ? (
                                                                        // For quotation items, show the quotation price as total
                                                                        `Quantity: ${item.quantity} × ₹${item.price?.toFixed(2) || '0.00'} = ₹${item.quotation_price?.toFixed(2) || '0.00'}`
                                                                    ) : (
                                                                        // For regular items, calculate quantity × price
                                                                        `Quantity: ${item.quantity} × ₹${item.price?.toFixed(2) || '0.00'} = ₹${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {order.items.length > 2 && (
                                                        <details className="group">
                                                            <summary className="cursor-pointer text-emerald-600 text-sm font-medium hover:text-emerald-700 list-none flex items-center">
                                                                <span>Show {order.items.length - 2} more items</span>
                                                                <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" 
                                                                     fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </summary>
                                                            <div className="mt-3 space-y-3">
                                                                {order.items.slice(2).map((item, idx) => (
                                                                    <div key={idx + 2} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                                        <img 
                                                                            src={item.image && (item.image.startsWith('http') || item.image.startsWith('/assets/')) 
                                                                                ? item.image : '/assets/placeholder.svg'} 
                                                                            alt={item.name} 
                                                                            className="w-12 h-12 object-cover rounded-lg flex-shrink-0" 
                                                                            onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }} 
                                                                        />
                                                                                                                                <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                                {item.is_quotation && (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                        Quotation
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600">
                                                                {item.is_quotation ? (
                                                                    // For quotation items, show the quotation price as total
                                                                    `Quantity: ${item.quantity} × ₹${item.price?.toFixed(2) || '0.00'} = ₹${item.quotation_price?.toFixed(2) || '0.00'}`
                                                                ) : (
                                                                    // For regular items, calculate quantity × price
                                                                    `Quantity: ${item.quantity} × ₹${item.price?.toFixed(2) || '0.00'} = ₹${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
                                                                )}
                                                            </p>
                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                    </details>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Price Breakdown for Quotation Orders */}
                                            {order.is_quotation_order && order.cart_items && (
                                                <div className="border-t border-gray-200 pt-3 mb-4">
                                                    <h4 className="font-medium text-gray-900 text-sm mb-3">Price Breakdown</h4>
                                                    <div className="space-y-2 text-sm">
                                                        {(() => {
                                                            let itemsTotal = 0;
                                                            let transportTotal = 0;
                                                            let customWorkTotal = 0;
                                                            
                                                            order.cart_items.forEach(item => {
                                                                itemsTotal += item.quotation_price || item.price || 0;
                                                                if (item.transport_cost) transportTotal += item.transport_cost;
                                                                if (item.custom_work_cost) customWorkTotal += item.custom_work_cost;
                                                            });
                                                            
                                                            return (
                                                                <>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Products Total</span>
                                                                        <span className="font-medium">₹{itemsTotal.toFixed(2)}</span>
                                                                    </div>
                                                                    {transportTotal > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Transport Cost</span>
                                                                            <span className="font-medium">₹{transportTotal.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    {customWorkTotal > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Custom Work Cost</span>
                                                                            <span className="font-medium">₹{customWorkTotal.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="border-t border-gray-200 pt-2">
                                                                        <div className="flex justify-between">
                                                                            <span className="font-semibold text-gray-900">Total Amount</span>
                                                                            <span className="font-bold text-lg text-gray-900">
                                                                                ₹{(itemsTotal + transportTotal + customWorkTotal).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Regular Order Total */}
                                            {!order.is_quotation_order && (
                                                <div className="border-t border-gray-200 pt-3 mb-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium text-gray-600">Order Total</span>
                                                        <span className="text-lg font-bold text-gray-900">
                                                            ₹{order.total_amount ? order.total_amount.toFixed(2) : '0.00'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Delivery Address */}
                                            <details className="group">
                                                <summary className="cursor-pointer text-gray-700 text-sm font-medium hover:text-gray-900 list-none flex items-center">
                                                    <span>Delivery Address</span>
                                                    <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" 
                                                         fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </summary>
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                                    {typeof order.address === 'string' ? order.address : order.address && typeof order.address === 'object' ? (
                                                        <div className="space-y-1">
                                                            {order.address.name && <div className="font-medium">{order.address.name}</div>}
                                                            {order.address.phone && <div>{order.address.phone}</div>}
                                                            {order.address.addressLine1 && <div>{order.address.addressLine1}</div>}
                                                            {order.address.addressLine2 && <div>{order.address.addressLine2}</div>}
                                                            <div>
                                                    {order.address.city && <span>{order.address.city}, </span>}
                                                    {order.address.state && <span>{order.address.state} </span>}
                                                                {order.address.pincode && <span>- {order.address.pincode}</span>}
                                                            </div>
                                                            {order.address.addressType && (
                                                                <div className="text-xs text-gray-500">({order.address.addressType})</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500">No address provided</div>
                                                    )}
                                        </div>
                                    </details>
                                </div>
                            ))
                        )}
                    </div>
                        </div>
                    </div>

                    {/* Wishlist Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-5 h-5 text-pink-500">💝</div>
                                <h3 className="font-semibold text-gray-900">Wishlist</h3>
                            </div>
                            
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                        {wishlistLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse flex space-x-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-3 bg-gray-200 rounded"></div>
                                                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                        ) : wishlist.length > 0 ? (
                            wishlist.map(item => {
                                const product = Array.isArray(item.products) ? item.products[0] : item.products;
                                return (
                                            <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                                <img 
                                                    src={product?.image_url && (product.image_url.startsWith('http') || product.image_url.startsWith('/assets/')) 
                                                        ? product.image_url : '/assets/placeholder.svg'} 
                                                    alt={product?.name} 
                                                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0" 
                                                    onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }} 
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm truncate">{product?.name}</p>
                                                    <p className="text-xs text-gray-600">₹{product?.price}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                                    <div className="text-center py-6">
                                        <div className="text-gray-300 text-2xl mb-2">💔</div>
                                        <p className="text-gray-500 text-sm">Your wishlist is empty</p>
                                    </div>
                        )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Orders; 