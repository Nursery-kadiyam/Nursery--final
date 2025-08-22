import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    ShoppingCart,
    Heart,
    Star,
    Trash2,
    ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { supabase } from "../lib/supabase";

const Wishlist = () => {
    const [wishlistItems, setWishlistItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchWishlist = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Step 1: Fetch wishlist items (get product_ids)
                const { data: wishlistData, error: wishlistError } = await supabase
                    .from("wishlist")
                    .select("id, product_id")
                    .eq("user_id", user.id);
                if (!wishlistError && wishlistData && wishlistData.length > 0) {
                    const productIds = wishlistData.map(item => item.product_id).filter(Boolean);
                    // Step 2: Fetch products by IDs
                    const { data: productsData, error: productsError } = await supabase
                        .from("products")
                        .select("*")
                        .in("id", productIds);
                    if (!productsError && productsData) {
                        // Step 3: Merge
                        const merged = wishlistData.map(item => {
                            const product = productsData.find(p => p.id === item.product_id);
                            if (product && product.id && product.name) {
                                return { ...product, wishlist_id: item.id };
                            }
                            return null;
                        }).filter(Boolean);
                        setWishlistItems(merged);
                    } else {
                        setWishlistItems([]);
                    }
                } else {
                    setWishlistItems([]);
                }
            } else {
                try {
                    const savedWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
                    setWishlistItems(savedWishlist.filter(item => item && item.id && item.name));
                } catch (error) {
                    setWishlistItems([]);
                }
            }
            setLoading(false);
        };
        fetchWishlist();
        window.addEventListener('wishlist-updated', fetchWishlist);
        return () => {
            window.removeEventListener('wishlist-updated', fetchWishlist);
        };
    }, []);

    const removeFromWishlist = async (plantId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', plantId);
            setWishlistItems(prev => prev.filter(item => item.id !== plantId));
        } else {
            const updatedWishlist = wishlistItems.filter(item => item.id !== plantId);
            setWishlistItems(updatedWishlist);
            localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
        }
        toast({
            title: "Removed from Wishlist",
            description: "Plant has been removed from your wishlist.",
        });
    };

    const addToCart = (plant: any) => {
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItemIndex = existingCart.findIndex((item: any) => item.id === plant.id);
        if (existingItemIndex >= 0) {
            existingCart[existingItemIndex].quantity += 1;
        } else {
            existingCart.push({
                id: plant.id,
                name: plant.name,
                category: plant.categories,
                price: plant.price,
                quantity: 1,
                image: plant.image_url || plant.image
            });
        }
        localStorage.setItem('cart', JSON.stringify(existingCart));
        window.dispatchEvent(new CustomEvent('cart-updated'));
        toast({
            title: "Added to Cart!",
            description: `${plant.name} has been added to your cart.`,
        });
    };

    return (
        <div className="min-h-screen bg-white font-montserrat">
            {/* Header */}
            <Navbar />

            {/* Hero Section */}
            <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-emerald-800 mb-6 font-montserrat">
                            My Wishlist
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto font-lora">
                            Your saved plants from Kadiyam Nursery
                        </p>
                    </div>
                </div>
            </section>

            {/* Wishlist Items */}
            <section className="py-12 sm:py-20">
                <div className="container mx-auto px-4">
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">Loading wishlist...</div>
                    ) : wishlistItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                            {wishlistItems.map((plant, index) => {
                                if (!plant || !plant.id || !plant.name) return null;
                                return (
                                    <Card
                                        key={plant.id || plant.wishlist_id}
                                        className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden animate-fade-in"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="relative h-48 sm:h-56 overflow-hidden">
                                            <img
                                                src={plant.image_url && (plant.image_url.startsWith('http') || plant.image_url.startsWith('/assets/'))
                                                    ? plant.image_url
                                                    : '/assets/placeholder.svg'}
                                                alt={`${plant.name} from Kadiyam Nursery`}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                                onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
                                            {plant.bestseller && (
                                                <div className="absolute top-3 left-3">
                                                    <Badge className="bg-gold-600 text-white font-semibold">
                                                        Bestseller
                                                    </Badge>
                                                </div>
                                            )}
                                            <button
                                                className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    removeFromWishlist(plant.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>

                                        <CardContent className="p-4 sm:p-6">
                                            <div className="mb-2">
                                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-xs">
                                                    {plant.categories}
                                                </Badge>
                                            </div>

                                            <h3 className="text-lg font-bold text-emerald-800 mb-2 group-hover:text-gold-600 transition-colors font-montserrat">
                                                {plant.name}
                                            </h3>

                                            <p className="text-gray-600 text-sm mb-3 font-lora line-clamp-2">
                                                {plant.description}
                                            </p>

                                            <div className="flex items-center mb-3">
                                                <div className="flex text-gold-500">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-4 h-4 ${i < Math.floor(plant.rating) ? 'fill-current' : 'text-gray-300'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-sm text-gray-600 ml-2 font-montserrat">
                                                    {plant.rating} ({plant.reviews})
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <span className="text-xl font-bold text-emerald-800 font-montserrat">₹{plant.price}</span>
                                                    {plant.originalPrice > plant.price && (
                                                        <span className="text-sm text-gray-500 line-through ml-2 font-montserrat">₹{plant.originalPrice}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => addToCart(plant)}
                                                className="w-full bg-gold-600 hover:bg-gold-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
                                            >
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Add to Cart
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">💚</div>
                            <h3 className="text-2xl font-bold text-gray-600 mb-4 font-montserrat">Your wishlist is empty</h3>
                            <p className="text-gray-500 mb-8 font-lora">Start adding your favorite plants to your wishlist</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link to="/shop">
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-montserrat">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Browse Plants
                                    </Button>
                                </Link>
                                <Link to="/">
                                    <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-montserrat">
                                        Go Home
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Call to Action */}
            {wishlistItems.length > 0 && (
                <section className="py-12 sm:py-20 bg-gradient-to-r from-emerald-600 to-emerald-800">
                    <div className="container mx-auto px-4 text-center">
                        <div className="max-w-4xl mx-auto animate-fade-in">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 font-montserrat">
                                Ready to Order Your Wishlist?
                            </h2>
                            <p className="text-lg sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto font-lora">
                                Add all your wishlist items to cart and get them delivered to your doorstep
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link to="/cart">
                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-gray-100 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                                    >
                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                        View Cart
                                    </Button>
                                </Link>
                                <Link to="/shop">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                                    >
                                        Continue Shopping
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Wishlist; 