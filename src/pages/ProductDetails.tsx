import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    ShoppingCart,
    Heart,
    Star,
    ArrowLeft,
    Plus,
    Minus,
    Truck,
    Shield,
    Leaf,
    Clock,
    X,
    ZoomIn,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { useCart } from '../contexts/CartContext';
import { supabase } from "../lib/supabase";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function safeString(val: unknown): string {
    return (typeof val === 'string') ? val : '';
}

// Product image mapping configuration
const getProductImages = (productName: string, productCategory: string): Array<{
    id: number;
    src: string;
    alt: string;
    thumbnail: string;
}> => {
    const productNameLower = productName.toLowerCase();
    const categoryLower = productCategory.toLowerCase();

    // Ganuga tree specific images
    if (productNameLower.includes('ganuga') || productNameLower.includes('pongamia')) {
        return [
            {
                id: 1,
                src: "/assets/ganuga.jpeg",
                alt: "Ganuga Tree - Main View",
                thumbnail: "/assets/ganuga.jpeg"
            },
            {
                id: 2,
                src: "/assets/ganuga1.jpeg",
                alt: "Ganuga Tree - Close Up",
                thumbnail: "/assets/ganuga1.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.14 PM.jpeg",
                alt: "Ganuga Tree - Growth Stage",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.14 PM.jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.15 PM.jpeg",
                alt: "Ganuga Tree - Mature Plant",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.15 PM.jpeg"
            }
        ];
    }

    // Ashoka tree specific images
    if (productNameLower.includes('ashoka') || productNameLower.includes('saraca')) {
        return [
            {
                id: 1,
                src: "/assets/Ashoka.jpeg",
                alt: "Ashoka Tree - Main View",
                thumbnail: "/assets/Ashoka.jpeg"
            },
            {
                id: 2,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM.jpeg",
                alt: "Ashoka Tree - Flowering",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM (1).jpeg",
                alt: "Ashoka Tree - Close Up",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM (1).jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.18 PM.jpeg",
                alt: "Ashoka Tree - Garden View",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.18 PM.jpeg"
            }
        ];
    }

    // Bamboo plants specific images
    if (productNameLower.includes('bamboo') || productNameLower.includes('bambusa')) {
        return [
            {
                id: 1,
                src: "/assets/Bamboo plants.jpeg",
                alt: "Bamboo Plants - Main View",
                thumbnail: "/assets/Bamboo plants.jpeg"
            },
            {
                id: 2,
                src: "/assets/golden bamboo.jpeg",
                alt: "Golden Bamboo - Variety",
                thumbnail: "/assets/golden bamboo.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.22 PM.jpeg",
                alt: "Bamboo Grove",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.22 PM.jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.23 PM.jpeg",
                alt: "Bamboo Plantation",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.23 PM.jpeg"
            }
        ];
    }

    // Cassia tree specific images
    if (productNameLower.includes('cassia') || productNameLower.includes('senna')) {
        return [
            {
                id: 1,
                src: "/assets/Cassia Tree.jpeg",
                alt: "Cassia Tree - Main View",
                thumbnail: "/assets/Cassia Tree.jpeg"
            },
            {
                id: 2,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.24 PM.jpeg",
                alt: "Cassia Tree - Flowering",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.24 PM.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.25 PM.jpeg",
                alt: "Cassia Tree - Yellow Blooms",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.25 PM.jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM.jpeg",
                alt: "Cassia Tree - Avenue Planting",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM.jpeg"
            }
        ];
    }

    // Croton plant specific images
    if (productNameLower.includes('croton') || productNameLower.includes('codiaeum')) {
        return [
            {
                id: 1,
                src: "/assets/Croton plant.jpeg",
                alt: "Croton Plant - Main View",
                thumbnail: "/assets/Croton plant.jpeg"
            },
            {
                id: 2,
                src: "/assets/croton plant .jpeg",
                alt: "Croton Plant - Colorful Leaves",
                thumbnail: "/assets/croton plant .jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM (1).jpeg",
                alt: "Croton Plant - Indoor Display",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM (1).jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.29 PM.jpeg",
                alt: "Croton Plant - Garden View",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.29 PM.jpeg"
            }
        ];
    }

    // Balaji nimma specific images
    if (productNameLower.includes('balaji') || productNameLower.includes('nimma')) {
        return [
            {
                id: 1,
                src: "/assets/Balaji nimma.jpeg",
                alt: "Balaji Nimma Plant - Main View",
                thumbnail: "/assets/Balaji nimma.jpeg"
            },
            {
                id: 2,
                src: "/assets/Balaji nimma1.jpeg",
                alt: "Balaji Nimma Plant - Close Up",
                thumbnail: "/assets/Balaji nimma1.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.38 PM (1).jpeg",
                alt: "Balaji Nimma Plant - Growth Stage",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.38 PM (1).jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.40 PM (1).jpeg",
                alt: "Balaji Nimma Plant - Mature Plant",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.40 PM (1).jpeg"
            }
        ];
    }

    // Boston Fern specific images
    if (productNameLower.includes('boston') || productNameLower.includes('fern')) {
        return [
            {
                id: 1,
                src: "/assets/Boston Fern.jpeg",
                alt: "Boston Fern - Main View",
                thumbnail: "/assets/Boston Fern.jpeg"
            },
            {
                id: 2,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.41 PM.jpeg",
                alt: "Boston Fern - Indoor Display",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.41 PM.jpeg"
            },
            {
                id: 3,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM.jpeg",
                alt: "Boston Fern - Hanging Basket",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM.jpeg"
            },
            {
                id: 4,
                src: "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM (1).jpeg",
                alt: "Boston Fern - Close Up",
                thumbnail: "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM (1).jpeg"
            }
        ];
    }

    // Default images for other products (generic plant images)
    return [
        {
            id: 1,
            src: "/assets/Ashoka.jpeg",
            alt: `${productName} - Main View`,
            thumbnail: "/assets/Ashoka.jpeg"
        },
        {
            id: 2,
            src: "/assets/Balaji nimma.jpeg",
            alt: `${productName} - Growth Stage`,
            thumbnail: "/assets/Balaji nimma.jpeg"
        },
        {
            id: 3,
            src: "/assets/Bamboo plants.jpeg",
            alt: `${productName} - Garden View`,
            thumbnail: "/assets/Bamboo plants.jpeg"
        },
        {
            id: 4,
            src: "/assets/Boston Fern.jpeg",
            alt: `${productName} - Close Up`,
            thumbnail: "/assets/Boston Fern.jpeg"
        }
    ];
};

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isInWishlist, setIsInWishlist] = useState(false);
    const { toast } = useToast();
    const { addToCart } = useCart();
    const [plant, setPlant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [descOpen, setDescOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [currentMainImage, setCurrentMainImage] = useState("/assets/placeholder.svg");
    const [reviewImages, setReviewImages] = useState<Array<{
        id: number;
        src: string;
        alt: string;
        thumbnail: string;
    }>>([]);

    // Plant information form state
    const [quotationForm, setQuotationForm] = useState({
        plantName: "",
        variety: "",
        plantType: "",
        quantity: "",
        ageCategory: "",
        heightRange: "",
        stemThickness: "",
        bagSize: "",
        isGrafted: false,
        deliveryLocation: "",
        deliveryTimeline: "",
        notes: ""
    });
    const [quotationPlantImage, setQuotationPlantImage] = useState<string>('/assets/placeholder.svg');

    // Get plant image based on plant name
    const getPlantImage = (plantName: string) => {
        if (!plantName) return '/assets/placeholder.svg';
        
        // Map common plant names to their corresponding images
        const plantImageMap: {[key: string]: string} = {
            'golden bamboo': '/assets/golden bamboo.jpeg',
            'akalifa pink': '/assets/akalifa pink.jpeg',
            'arkeliform': '/assets/Arkeliform.jpeg',
            'ashoka': '/assets/Ashoka.jpeg',
            'bamboo': '/assets/Bamboo plants.jpeg',
            'boston fern': '/assets/Boston Fern.jpeg',
            'cassia': '/assets/Cassia Tree.jpeg',
            'croton': '/assets/Croton plant.jpeg',
            'gulmohar': '/assets/Gulmohar.jpeg',
            'neem': '/assets/Neem.jpeg',
            'rose': '/assets/Rose Bush.jpeg',
            'spider lily': '/assets/Spider lilly.jpeg',
            'star fruit': '/assets/Star fruit .jpeg',
            'terminalia': '/assets/Terminalia green.jpeg',
            'thailand ixora': '/assets/Thailand ixora.jpeg',
            'tiwan pink jama': '/assets/Tiwan pink jama.jpeg',
            'ujenia avenue': '/assets/Ujenia avenue.jpeg',
            'vepa': '/assets/Vepa.jpeg',
            'hibiscus': '/assets/lipstick red.jpeg',
            'ganuga': '/assets/ganuga.jpeg',
            'bogada': '/assets/Bogada.jpeg',
            'conacorpus': '/assets/ConaCorpus.jpeg',
            'conokarpas': '/assets/Conokarpas.jpeg',
            'cypress': '/assets/Cypress old.jpeg',
            'dianella grass': '/assets/Dianella grass.jpeg',
            'dismodiya': '/assets/Dismodiya.jpeg',
            'dracina': '/assets/Dracina.jpeg',
            'drogun fruits': '/assets/Drogun Fruits.jpeg',
            'ficus lyrata': '/assets/Ficus lyrata.jpeg',
            'foxtail': '/assets/Foxtail.jpeg',
            'grandis': '/assets/Grandis.jpeg',
            'gulmohar avenue': '/assets/Gulmohar avenue plants.jpeg',
            'helikoniya': '/assets/Helikoniya.jpeg',
            'jatropha': '/assets/Jatropha.jpeg',
            'kaya': '/assets/kaya.jpeg',
            'kobbari': '/assets/kobbari.jpeg',
            'konacarpas': '/assets/Konacarpas.jpeg',
            'lipstick red': '/assets/lipstick red.jpeg',
            'mahagani': '/assets/Mahagani.jpeg',
            'mahatama': '/assets/mahatama.jpeg',
            'market nimma': '/assets/Market nimma.jpeg',
            'marri trees': '/assets/marri trees.jpeg',
            'micro carfa spiral': '/assets/Micro carfa spiral shape.jpeg',
            'micro multi balls': '/assets/Micro multi balls.jpeg',
            'mirchi mere green': '/assets/Mirchi mere green.jpeg',
            'mirchi mery gold': '/assets/Mirchi mery gold.jpeg',
            'noda': '/assets/Noda.jpeg',
            'pendanus': '/assets/pendanus.jpeg',
            'ravi': '/assets/Ravi.jpeg',
            'rela': '/assets/Rela.jpeg',
            'seetapalam': '/assets/Seetapalam.jpeg',
            'starlight': '/assets/Starlight.jpeg',
            'tabibiya roja': '/assets/Tabibiya roja.jpeg',
            'tabibiya rosea': '/assets/Tabibiya rosea.jpeg',
            'terminalia green': '/assets/Terminalia green.jpeg',
            'terminiliya': '/assets/Terminiliya.jpeg',
            'thailemon': '/assets/Thailemon .jpeg',
            'ujenia mini': '/assets/Ujniya mini.jpeg'
        };
        
        const lowerPlantName = plantName.toLowerCase();
        for (const [key, imagePath] of Object.entries(plantImageMap)) {
            if (lowerPlantName.includes(key)) {
                return imagePath;
            }
        }
        
        return '/assets/placeholder.svg';
    };

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            if (!id) return;
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (!error && data) {
                setPlant(data);
                // Set the main image to the product's image_url
                const mainImage = data.image_url && typeof data.image_url === 'string' && (data.image_url.startsWith('http') || data.image_url.startsWith('/assets/'))
                    ? data.image_url
                    : '/assets/placeholder.svg';
                setCurrentMainImage(mainImage);
                
                // Get product-specific review images
                const productImages = getProductImages(data.name, data.category || '');
                setReviewImages(productImages);

                // Initialize quotation form with product data
                setQuotationForm(prev => ({
                    ...prev,
                    plantName: data.name || "",
                    plantType: data.category || ""
                }));
                
                // Set initial plant image
                const initialPlantImage = getPlantImage(data.name || "");
                setQuotationPlantImage(initialPlantImage);
            }
            setLoading(false);
        };
        fetchProduct();
    }, [id]);

    useEffect(() => {
        // Check if plant is in wishlist
        const checkWishlistStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check Supabase wishlist for logged-in user
                const { data, error } = await supabase
                    .from('wishlist')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('product_id', id)
                    .single();
                setIsInWishlist(!!data);
            } else {
                // Fallback to localStorage for guests
                const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
                setIsInWishlist(wishlist.some((item: any) => item.id === parseInt(id || "0")));
            }
        };
        checkWishlistStatus();
    }, [id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (imageModalOpen) {
                if (e.key === 'Escape') setImageModalOpen(false);
                if (e.key === 'ArrowRight') {
                    setSelectedImageIndex((prev) => (prev + 1) % (reviewImages.length + 1));
                }
                if (e.key === 'ArrowLeft') {
                    setSelectedImageIndex((prev) => (prev - 1 + reviewImages.length + 1) % (reviewImages.length + 1));
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [imageModalOpen, reviewImages.length]);

    const addToWishlist = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            if (isInWishlist) {
                await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', plant.id);
                setIsInWishlist(false);
                toast({
                    title: "Removed from Wishlist",
                    description: `${plant.name} has been removed from your wishlist.`,
                });
            } else {
                const { error } = await supabase.from('wishlist').insert([
                    { user_id: user.id, product_id: plant.id }
                ]);
                if (!error) {
                    setIsInWishlist(true);
                    toast({
                        title: "Added to Wishlist",
                        description: `${plant.name} has been added to your wishlist.`,
                    });
                } else {
                    toast({
                        title: "Error",
                        description: "Could not add to wishlist.",
                    });
                }
            }
        } else {
            // Fallback to localStorage for guests
            const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            if (isInWishlist) {
                const updatedWishlist = wishlist.filter((item: any) => item.id !== plant.id);
                localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
                setIsInWishlist(false);
                toast({
                    title: "Removed from Wishlist",
                    description: `${plant.name} has been removed from your wishlist.`,
                });
            } else {
                let imageUrl = typeof plant.image === 'string' ? plant.image : '';
                if (typeof plant.image === 'string' && plant.image.startsWith('/assets/')) {
                    imageUrl = window.location.origin + plant.image;
                } else if (typeof plant.image === 'string' && !plant.image.startsWith('http')) {
                    imageUrl = `https://images.unsplash.com/${plant.image}?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80`;
                } else if (!imageUrl) {
                    imageUrl = '/assets/placeholder.svg';
                }
                wishlist.push({ ...plant, image: imageUrl });
                localStorage.setItem('wishlist', JSON.stringify(wishlist));
                setIsInWishlist(true);
                toast({
                    title: "Added to Wishlist",
                    description: `${plant.name} has been added to your wishlist.`,
                });
            }
            window.dispatchEvent(new CustomEvent('wishlist-updated'));
        }
    };

    const addToCartHandler = async () => {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // User not logged in - show login popup
            window.dispatchEvent(new CustomEvent('open-login-popup'));
            toast({
                title: "Login Required",
                description: "Please log in to add items to your cart.",
                variant: "destructive"
            });
            return;
        }

        const cartQuantity = quotationForm.quantity;
        if (!cartQuantity || isNaN(Number(cartQuantity)) || Number(cartQuantity) < 1) {
            toast({
                title: "Invalid Quantity",
                description: "Please enter a valid quantity.",
                variant: "destructive"
            });
            return;
        }
        
        // Debug: Log the form data being added to cart
        console.log('Adding to cart with form data:', {
            quotationForm,
            cartQuantity
        });
        
        addToCart({
            id: String(plant.id),
            name: plant.name,
            category: plant.category,
            price: plant.price,
            quantity: Number(cartQuantity),
            image: plant.image_url && typeof plant.image_url === 'string' && (plant.image_url.startsWith('http') || plant.image_url.startsWith('/assets/'))
                ? plant.image_url
                : '/assets/placeholder.svg',
            // Include form data for detailed specifications
            plantType: quotationForm.plantType || undefined,
            variety: quotationForm.variety || undefined,
            ageCategory: quotationForm.ageCategory || undefined,
            heightRange: quotationForm.heightRange || undefined,
            stemThickness: quotationForm.stemThickness || undefined,
            bagSize: quotationForm.bagSize || undefined,
            isGrafted: quotationForm.isGrafted || false,
            deliveryLocation: quotationForm.deliveryLocation || undefined,
            deliveryTimeline: quotationForm.deliveryTimeline || undefined
        }, Number(cartQuantity));
        toast({
            title: "Added to Cart!",
            description: `${cartQuantity} ${plant.name}${Number(cartQuantity) > 1 ? 's' : ''} added to your cart.`,
        });
    };

    // Quotation form handlers
    const handleQuotationFormChange = (field: string, value: any) => {
        setQuotationForm(prev => ({
            ...prev,
            [field]: value
        }));
        
        // If plant name is changed, update the plant image
        if (field === 'plantName') {
            const plantImage = getPlantImage(value);
            setQuotationPlantImage(plantImage);
        }
    };

    const openImageModal = (index: number) => {
        setSelectedImageIndex(index);
        setImageModalOpen(true);
    };

    const closeImageModal = () => {
        setImageModalOpen(false);
    };

    const nextImage = () => {
        setSelectedImageIndex((prev) => (prev + 1) % (reviewImages.length + 1));
    };

    const prevImage = () => {
        setSelectedImageIndex((prev) => (prev - 1 + reviewImages.length + 1) % (reviewImages.length + 1));
    };

    const switchMainImage = (imageSrc: string) => {
        setCurrentMainImage(imageSrc);
    };



    // Early return if plant not found
    if (!plant) {
        return (
            <div className="min-h-screen bg-white font-montserrat">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <h1 className="text-2xl font-bold text-gray-600 mb-4">Plant not found</h1>
                    <Link to="/shop">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Shop
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-montserrat">
            <Navbar />

            {/* Product Details */}
            <section className="py-6 sm:py-12 lg:py-20">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                        {/* Product Image */}
                        <div className="space-y-4 sm:space-y-6">
                            <div className="relative h-80 sm:h-80 lg:h-[500px] rounded-lg overflow-hidden shadow-lg group cursor-pointer">
                                <img
                                    src={currentMainImage}
                                    alt={plant.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                    onClick={() => openImageModal(0)}
                                />
                                
                                {/* Zoom overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                    <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                
                                {plant.bestseller && (
                                    <div className="absolute top-4 left-4">
                                        <Badge className="bg-gold-600 text-white font-semibold">
                                            Bestseller
                                        </Badge>
                                    </div>
                                )}
                                <button
                                    onClick={addToWishlist}
                                    className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isInWishlist
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/90 text-gray-600 hover:bg-red-100'
                                        }`}
                                >
                                    <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                                </button>
                            </div>
                            
                            {/* Professional Review Images Section */}
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 sm:p-6 rounded-xl border border-emerald-100">
                                
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-full sm:max-w-md">
                                    {reviewImages.map((image, idx) => (
                                        <div 
                                            key={image.id}
                                            className={`relative group cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                                                currentMainImage === image.src 
                                                    ? 'border-emerald-500 shadow-lg' 
                                                    : 'border-emerald-200 hover:border-emerald-400'
                                            }`}
                                            onClick={() => switchMainImage(image.src)}
                                        >
                                            <img
                                                src={image.thumbnail}
                                                alt={image.alt}
                                                className="w-full h-12 object-cover transition-transform duration-300 group-hover:scale-110"
                                                onError={e => { 
                                                    e.currentTarget.src = '/assets/placeholder.svg';
                                                    e.currentTarget.className = 'w-full h-12 object-cover opacity-50';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </div>
                                            {currentMainImage === image.src && (
                                                <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                                    <span className="text-xs font-bold">✓</span>
                                                </div>
                                            )}

                                        </div>
                                    ))}
                                </div>
                                

                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="space-y-6">
                            <div>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 mb-3">
                                    {plant.category}
                                </Badge>
                                <h1 className="text-3xl sm:text-4xl font-bold text-emerald-800 mb-4 font-montserrat">
                                    {plant.name}
                                </h1>
                                <p className="text-lg text-gray-600 mb-4 font-lora">
                                    {plant.description}
                                </p>
                                <Dialog open={descOpen} onOpenChange={setDescOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="mb-2" onClick={() => setDescOpen(true)}>
                                            View Full Description
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>About {plant.name}</DialogTitle>
                                            <DialogDescription className="sr-only">
                                                Detailed information about {plant.name} including care instructions and plant details
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 text-left">
                                            <div>
                                                <span className="font-semibold">🌞 Common Name:</span> {plant.commonName || plant.name}
                                            </div>
                                            <div>
                                                <span className="font-semibold">🌱 Botanical Name:</span> {plant.botanicalName || plant.name}
                                            </div>
                                            <div>
                                                <span className="font-semibold">🌏 Regional Names in India:</span> {plant.regionalNames || 'N/A'}
                                            </div>
                                            <hr />
                                            <h2 className="text-xl font-bold mt-2">A Stunning Choice for Your Garden 🌳💛</h2>
                                            <p>{plant.detailedDescription || 'If you\'re searching for a unique, fast-growing plant that brings beauty and an element of intrigue to your garden, look no further than this plant. Its golden-hued foliage and unique fruit make it a standout feature in any landscape, while its rapid growth makes it perfect for creating lush shade quickly.'}</p>
                                            <hr />
                                            <h2 className="text-lg font-bold">Why Choose {plant.botanicalName || plant.name}? 🪴</h2>
                                            <ul className="list-disc ml-6">
                                                <li><b>Category:</b> {plant.category}</li>
                                                <li><b>Family:</b> {plant.family || 'N/A'}</li>
                                                <li><b>Title:</b> {plant.title || 'The Perfect Fast-Growing Tree for Shade, Beauty, and Privacy'}</li>
                                            </ul>
                                            <hr />
                                            <h2 className="text-lg font-bold">Product Information 📄</h2>
                                            <ul className="list-disc ml-6">
                                                <li><b>Plant Size:</b> {plant.size || 'Mature height ranges from 15 to 20 feet, offering plenty of shade.'}</li>
                                                <li><b>Growth Rate:</b> {plant.growthRate || 'Rapid, growing up to 2-3 feet annually when cared for correctly.'}</li>
                                                <li><b>Leaves & Fruit:</b> {plant.leavesFruit || 'Dark green, glossy leaves with contrasting yellow undersides; large, round fruit adds a unique decorative touch.'}</li>
                                                <li><b>Ideal Climate:</b> {plant.idealClimate || 'Thrives in India\'s humid and warm climates, especially in tropical and coastal regions.'}</li>
                                            </ul>
                                            <hr />
                                            <h2 className="text-lg font-bold">Caring for Your {plant.botanicalName || plant.name} Plant 🌱</h2>
                                            <ul className="list-disc ml-6">
                                                <li><b>Sunlight:</b> {plant.sunlight || 'Partial to full sunlight; ideally suited for semi-shade.'}</li>
                                                <li><b>Watering:</b> {plant.watering || 'Moderate; water deeply once or twice a week, allowing the soil to dry slightly between waterings.'}</li>
                                                <li><b>Soil Type:</b> {plant.soilType || 'Prefers well-drained, sandy or loamy soils; avoid waterlogging.'}</li>
                                                <li><b>Temperature:</b> {plant.temperature || 'Tolerates temperatures between 20-35°C, making it perfect for most Indian climates.'}</li>
                                                <li><b>Fertilizer:</b> {plant.fertilizer || 'Organic compost or a balanced, slow-release fertilizer every few months encourages healthy growth and vibrant leaves.'}</li>
                                            </ul>
                                            <hr />
                                            <h2 className="text-lg font-bold">Benefits & Uses 🌿🦁</h2>
                                            <div>{plant.benefits || 'Regular pruning ensures it maintains a neat shape, while mulching around the base helps conserve soil moisture.'}</div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center space-x-2">
                                <div className="flex text-gold-500">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-5 h-5 ${i < Math.floor(plant.rating) ? 'fill-current' : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-600 font-montserrat">
                                    {plant.rating} ({plant.reviews} reviews)
                                </span>
                            </div>

                            {/* Price */}
                            <div className="flex items-center space-x-4">
                                <span className="text-3xl font-bold text-emerald-800 font-montserrat">
                                    {plant.price}
                                </span>
                                {plant.originalPrice > plant.price && (
                                    <span className="text-lg text-gray-500 line-through ml-2 font-montserrat">
                                        {plant.originalPrice}
                                    </span>
                                )}
                                {plant.originalPrice > plant.price && (
                                    <Badge className="bg-red-500 text-white">
                                        {Math.round(((plant.originalPrice - plant.price) / plant.originalPrice) * 100)}% OFF
                                    </Badge>
                                )}
                            </div>

                            {/* Plant Information Form */}
                            <div className="space-y-6">
                                {/* Plant Information Section */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Plant Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="plantName" className="text-sm font-medium text-gray-700">
                                                Plant Name *
                                            </Label>
                                            <Input
                                                id="plantName"
                                                value={quotationForm.plantName}
                                                onChange={(e) => handleQuotationFormChange('plantName', e.target.value)}
                                                className="mt-1"
                                                placeholder="Type to search plants..."
                                            />
                                        </div>
                                        
                                        {/* Plant Image Display */}
                                        {quotationPlantImage && quotationPlantImage !== '/assets/placeholder.svg' && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Plant Image
                                                </Label>
                                                <div className="mt-2 flex items-center space-x-4">
                                                    <img
                                                        src={quotationPlantImage}
                                                        alt={quotationForm.plantName || 'Selected plant'}
                                                        className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/assets/placeholder.svg';
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Selected:</span> {quotationForm.plantName || 'No plant selected'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Image will be displayed when you enter a plant name
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <Label htmlFor="variety" className="text-sm font-medium text-gray-700">
                                                Variety / Hybrid
                                            </Label>
                                            <Input
                                                id="variety"
                                                value={quotationForm.variety}
                                                onChange={(e) => handleQuotationFormChange('variety', e.target.value)}
                                                className="mt-1"
                                                placeholder="e.g., Banganapalli Mango, Hybrid Tea Rose, East Coast Tall Coconut"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="plantType" className="text-sm font-medium text-gray-700">
                                                Plant Type
                                            </Label>
                                            <Select
                                                value={quotationForm.plantType}
                                                onValueChange={(value) => handleQuotationFormChange('plantType', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select plant type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Fruit">Fruit</SelectItem>
                                                    <SelectItem value="Ornamental/Flowering">Ornamental/Flowering</SelectItem>
                                                    <SelectItem value="Timber">Timber</SelectItem>
                                                    <SelectItem value="Avenue">Avenue</SelectItem>
                                                    <SelectItem value="Medicinal">Medicinal</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Growth / Age Details Section */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth / Age Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="ageCategory" className="text-sm font-medium text-gray-700">
                                                Age Category
                                            </Label>
                                            <Select
                                                value={quotationForm.ageCategory}
                                                onValueChange={(value) => handleQuotationFormChange('ageCategory', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select age category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="6 months">6 months</SelectItem>
                                                    <SelectItem value="1 year">1 year</SelectItem>
                                                    <SelectItem value="2 years">2 years</SelectItem>
                                                    <SelectItem value="3+ years">3+ years</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="heightRange" className="text-sm font-medium text-gray-700">
                                                Height Range
                                            </Label>
                                            <Select
                                                value={quotationForm.heightRange}
                                                onValueChange={(value) => handleQuotationFormChange('heightRange', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select height range" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1–2 ft">1–2 ft</SelectItem>
                                                    <SelectItem value="3–4 ft">3–4 ft</SelectItem>
                                                    <SelectItem value="5–6 ft">5–6 ft</SelectItem>
                                                      <SelectItem value=">6 ft">&gt;6 ft</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="stemThickness" className="text-sm font-medium text-gray-700">
                                                Stem Thickness (Optional)
                                            </Label>
                                            <Input
                                                id="stemThickness"
                                                type="number"
                                                value={quotationForm.stemThickness}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow empty string and numeric input
                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                        handleQuotationFormChange('stemThickness', value);
                                                    }
                                                }}
                                                className="mt-1"
                                                placeholder="Enter in cm/mm"
                                                step="0.1"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="bagSize" className="text-sm font-medium text-gray-700">
                                                Bag/Pot Size
                                            </Label>
                                            <Select
                                                value={quotationForm.bagSize}
                                                onValueChange={(value) => handleQuotationFormChange('bagSize', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select bag/pot size" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="6 inches">6 inches</SelectItem>
                                                    <SelectItem value="8 inches">8 inches</SelectItem>
                                                    <SelectItem value="12 inches">12 inches</SelectItem>
                                                    <SelectItem value="16 inches">16 inches</SelectItem>
                                                    <SelectItem value="Ground-grown">Ground-grown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Grafted / Seedling Section */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Grafted / Seedling</h3>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="isGrafted"
                                                checked={quotationForm.isGrafted}
                                                onCheckedChange={(checked) => handleQuotationFormChange('isGrafted', checked)}
                                            />
                                            <Label htmlFor="isGrafted" className="text-sm font-medium text-gray-700">
                                                Grafted Plant (Yes)
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="isSeedling"
                                                checked={!quotationForm.isGrafted}
                                                onCheckedChange={(checked) => handleQuotationFormChange('isGrafted', !checked)}
                                            />
                                            <Label htmlFor="isSeedling" className="text-sm font-medium text-gray-700">
                                                Seedling (No)
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                {/* Quantity & Delivery Section */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantity & Delivery</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                                                Quantity Required *
                                            </Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                value={quotationForm.quantity}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow empty string and any numeric input
                                                    if (value === '' || /^\d*$/.test(value)) {
                                                        handleQuotationFormChange('quantity', value);
                                                    }
                                                }}
                                                className="mt-1"
                                                placeholder="e.g., 250"
                                                min="1"
                                                step="1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="deliveryLocation" className="text-sm font-medium text-gray-700">
                                                Delivery Location
                                            </Label>
                                            <Input
                                                id="deliveryLocation"
                                                value={quotationForm.deliveryLocation}
                                                onChange={(e) => handleQuotationFormChange('deliveryLocation', e.target.value)}
                                                className="mt-1"
                                                placeholder="e.g., Vijayawada, Krishna District, 520001"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="deliveryTimeline" className="text-sm font-medium text-gray-700">
                                                Delivery Timeline
                                            </Label>
                                            <Input
                                                id="deliveryTimeline"
                                                value={quotationForm.deliveryTimeline}
                                                onChange={(e) => handleQuotationFormChange('deliveryTimeline', e.target.value)}
                                                className="mt-1"
                                                placeholder="e.g., Within 15 days"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="hidden sm:flex flex-col sm:flex-row gap-4">
                                <Button
                                    onClick={addToCartHandler}
                                    disabled={plant.available_quantity <= 0}
                                    className="flex-1 bg-gold-600 hover:bg-gold-700 text-white font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                                >
                                    <ShoppingCart className="w-5 h-5 mr-2" />
                                    {plant.available_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                                </Button>
                                <Button
                                    onClick={() => {
                                        addToCartHandler();
                                        navigate('/cart');
                                    }}
                                    disabled={plant.available_quantity <= 0}
                                    variant="outline"
                                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-montserrat min-h-[48px] w-60"
                                >
                                    Buy Now
                                </Button>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <Truck className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm text-gray-600">Free Delivery</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm text-gray-600">Quality Guarantee</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Leaf className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm text-gray-600">Healthy Plants</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Clock className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm text-gray-600">Fast Delivery</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Information */}
            <section className="py-12 bg-emerald-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Detailed Description */}
                        <div>
                            <h2 className="text-2xl font-bold text-emerald-800 mb-6 font-montserrat">
                                About This Plant
                            </h2>
                            <p className="text-gray-600 leading-relaxed font-lora">
                                {plant && typeof plant === 'object' && typeof plant.detailedDescription === 'string'
                                    ? plant.detailedDescription
                                    : plant && typeof plant === 'object' && typeof plant.description === 'string'
                                        ? plant.description
                                        : 'No description available for this plant.'}
                            </p>
                        </div>

                        {/* Care Instructions */}
                        <div>
                            <h2 className="text-2xl font-bold text-emerald-800 mb-6 font-montserrat">
                                Care Instructions
                            </h2>
                            <p className="text-gray-600 leading-relaxed font-lora">
                                {plant.careInstructions}
                            </p>
                        </div>
                    </div>

                    {/* Specifications */}
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-emerald-800 mb-6 font-montserrat">
                            Specifications
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                    {plant.specifications && typeof plant.specifications === 'object'
                            ? Object.entries(plant.specifications).map(([key, value]) => (
                                <Card key={key} className="border-emerald-200">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-sm text-gray-500 font-medium mb-1">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </div>
                                        <div className="text-emerald-800 font-semibold font-montserrat">
                                            {String(value)}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                            : [<div key="no-specs" className="text-gray-500 col-span-full">No specifications available.</div>]
                        }
                        </div>
                    </div>
                </div>
            </section>

            {/* Back to Shop */}
            <section className="py-12">
                <div className="container mx-auto px-4 text-center">
                    <Link to="/shop">
                        <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-montserrat">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Shop
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Mobile Bottom Action Bar & Navigation */}
            <div className="fixed bottom-0 left-0 w-full z-50 bg-white sm:hidden border-t border-gray-200">
                <div className="flex w-full">
                    <button
                        onClick={addToCartHandler}
                        className="flex-1 py-4 text-lg font-semibold bg-gold-600 hover:bg-gold-700 text-white transition-all duration-200 focus:outline-none"
                        style={{ borderRight: '1px solid #eee' }}
                        disabled={plant.available_quantity <= 0}
                    >
                        Add to cart
                    </button>
                    <button
                        onClick={() => { addToCartHandler(); navigate('/cart'); }}
                        className="flex-1 py-4 text-lg font-semibold border border-emerald-600 text-emerald-600 hover:bg-emerald-50 bg-white transition-all duration-200 focus:outline-none"
                        disabled={plant.available_quantity <= 0}
                    >
                        Buy now
                    </button>
                </div>
                <div className="flex justify-around items-center py-2 bg-white border-t border-gray-100">
                    <Link to="/" className="flex flex-col items-center text-xs">
                        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7m-9 2v7a2 2 0 002 2h2a2 2 0 002-2v-7m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-blue-600 font-semibold">Home</span>
                    </Link>
                    <Link to="/play" className="flex flex-col items-center text-xs text-gray-700">
                        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        <span>Play</span>
                    </Link>
                    <Link to="/plants" className="flex flex-col items-center text-xs text-gray-700">
                        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        <span>Categories</span>
                    </Link>
                    <Link to="/account" className="flex flex-col items-center text-xs text-gray-700">
                        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0113 0" /></svg>
                        <span>Account</span>
                    </Link>
                    <Link to="/cart" className="flex flex-col items-center text-xs text-gray-700 relative">
                        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
                        <span>Cart</span>
                        {Number(quotationForm.quantity) > 0 && (
                            <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{quotationForm.quantity}</span>
                        )}
                    </Link>
                </div>
            </div>
            
            {/* Professional Image Modal/Lightbox */}
            {imageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                    <div className="relative max-w-7xl max-h-[90vh] mx-4">
                        {/* Close button */}
                        <button
                            onClick={closeImageModal}
                            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        {/* Navigation buttons */}
                        <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        
                        <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                        
                        {/* Main image */}
                        <div className="relative">
                            <img
                                src={selectedImageIndex === 0 
                                    ? (plant.image_url && typeof plant.image_url === 'string' && (plant.image_url.startsWith('http') || plant.image_url.startsWith('/assets/'))
                                        ? plant.image_url
                                        : '/assets/placeholder.svg')
                                    : reviewImages[selectedImageIndex - 1]?.src || '/assets/placeholder.svg'
                                }
                                alt={selectedImageIndex === 0 
                                    ? plant.name 
                                    : reviewImages[selectedImageIndex - 1]?.alt || 'Review image'
                                }
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                            />
                        </div>
                        
                        {/* Image counter */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {selectedImageIndex + 1} of {reviewImages.length + 1}
                        </div>
                        
                        {/* Image title */}
                        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm max-w-md">
                            {selectedImageIndex === 0 
                                ? plant.name 
                                : reviewImages[selectedImageIndex - 1]?.alt || 'Review image'
                            }
                        </div>
                        
                        {/* Thumbnail navigation */}
                        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {[plant, ...reviewImages].map((image, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImageIndex(idx)}
                                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                                        idx === selectedImageIndex 
                                            ? 'border-white scale-110' 
                                            : 'border-white/50 hover:border-white/80'
                                    }`}
                                >
                                    <img
                                        src={idx === 0 
                                            ? (plant.image_url && typeof plant.image_url === 'string' && (plant.image_url.startsWith('http') || plant.image_url.startsWith('/assets/'))
                                                ? plant.image_url
                                                : '/assets/placeholder.svg')
                                            : image.thumbnail || '/assets/placeholder.svg'
                                        }
                                        alt={idx === 0 ? plant.name : image.alt || 'Thumbnail'}
                                        className="w-full h-full object-cover"
                                        onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetails;