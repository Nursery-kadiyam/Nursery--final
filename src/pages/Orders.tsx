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
                    .eq("user_id", user.id)
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
                    .select(`id, created_at, status, delivery_address, order_items:order_items(id, quantity, price, product:product_id(id, name, image_url))`)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                // Format orders for display
                const formattedOrders = (data || []).map(order => ({
                    id: order.id,
                    date: order.created_at,
                    status: order.status,
                    address: order.delivery_address,
                    items: (order.order_items || []).map(item => {
                        const product = Array.isArray(item.product) ? item.product[0] : item.product;
                        return {
                            name: product?.name,
                            image: product?.image_url,
                            quantity: item.quantity,
                            price: item.price
                        };
                    })
                }));
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white py-8 px-2">
            {/* Header */}
            <div className="w-full bg-white shadow flex items-center px-6 py-3 mb-8 rounded-xl">
                <span className="text-2xl font-bold font-montserrat tracking-wide">
                    <span className="text-emerald-800">Nursery</span> <span className="text-gold-600">Kadiyam</span>
                </span>
            </div>
            <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
                {/* Profile Card */}
                <section className="md:w-1/4 w-full mb-8 md:mb-0">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl font-bold text-emerald-700 mb-3">
                            {profileLoading ? '?' : getInitials(profile)}
                        </div>
                        {profileLoading ? (
                            <div className="text-gray-400">Loading...</div>
                        ) : profile ? (
                            <>
                                <div className="font-semibold text-lg">{profile.first_name} {profile.last_name}</div>
                                <div className="text-gray-500 text-sm">{profile.email}</div>
                                <div className="text-gray-400 text-xs">{profile.phone || 'Not provided'}</div>
                            </>
                        ) : (
                            <div className="text-gray-400">No profile info found.</div>
                        )}
                    </div>
                </section>
                {/* Orders */}
                <section className="md:w-2/4 w-full mb-8 md:mb-0">
                    <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <span role="img" aria-label="orders">🛒</span> My Orders
                    </h2>
                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-gray-400">Loading your orders...</div>
                        ) : error ? (
                            <div className="text-red-500">{error}</div>
                        ) : orders.length === 0 ? (
                            <div className="text-gray-500">You have no orders yet.</div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl shadow-lg p-6 transition hover:shadow-xl animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-emerald-700">Order #{order.id}</span>
                                        <span className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-600' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {order.status || 'Processing'}
                                        </span>
                                    </div>
                                    {/* Items toggle */}
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-emerald-700 font-semibold">Show Items</summary>
                                        <ul className="mt-2 space-y-2">
                                            {order.items.map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-3 border rounded p-2 bg-emerald-50">
                                                    <img src={item.image && (item.image.startsWith('http') || item.image.startsWith('/assets/')) ? item.image : '/assets/placeholder.svg'} alt={item.name} className="w-12 h-12 object-cover rounded" onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }} />
                                                    <div>
                                                        <div className="font-semibold">{item.name}</div>
                                                        <div className="text-xs text-gray-600">Qty: {item.quantity} | ₹{item.price}</div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                    {/* Address toggle */}
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-emerald-700 font-semibold">Show Address</summary>
                                        <div className="mt-2 text-sm text-gray-700">
                                            <strong>Delivery Address:</strong> {typeof order.address === 'string' ? order.address : order.address && typeof order.address === 'object' ? (
                                                <span>
                                                    {order.address.name && <span>{order.address.name}<br /></span>}
                                                    {order.address.phone && <span>{order.address.phone}<br /></span>}
                                                    {order.address.addressLine1 && <span>{order.address.addressLine1}<br /></span>}
                                                    {order.address.addressLine2 && <span>{order.address.addressLine2}<br /></span>}
                                                    {order.address.city && <span>{order.address.city}, </span>}
                                                    {order.address.state && <span>{order.address.state} </span>}
                                                    {order.address.pincode && <span>- {order.address.pincode}<br /></span>}
                                                    {order.address.addressType && <span>({order.address.addressType})</span>}
                                                </span>
                                            ) : ''}
                                        </div>
                                    </details>
                                </div>
                            ))
                        )}
                    </div>
                </section>
                {/* Wishlist */}
                <section className="md:w-1/4 w-full">
                    <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <span role="img" aria-label="wishlist">💚</span> Wishlist
                    </h2>
                    <div className="space-y-4">
                        {wishlistLoading ? (
                            <div className="text-gray-400">Loading wishlist...</div>
                        ) : wishlist.length > 0 ? (
                            wishlist.map(item => {
                                const product = Array.isArray(item.products) ? item.products[0] : item.products;
                                return (
                                    <div key={item.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3 hover:shadow-lg transition animate-fade-in">
                                        <img src={product?.image_url && (product.image_url.startsWith('http') || product.image_url.startsWith('/assets/')) ? product.image_url : '/assets/placeholder.svg'} alt={product?.name} className="w-10 h-10 object-cover rounded" onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }} />
                                        <div className="flex-1">
                                            <div className="font-semibold text-emerald-800">{product?.name}</div>
                                            <div className="text-xs text-gray-600">₹{product?.price}</div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-500">Your wishlist is empty.</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Orders; 