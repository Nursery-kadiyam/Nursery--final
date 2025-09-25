import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  Star,
  Search,
  Filter
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { supabase } from "../lib/supabase";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCategory = searchParams.get('category') || 'all';

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser behavior
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const { toast } = useToast();
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: "all", label: "All Plants" },
    { value: "ornamental-plants", label: "Ornamental Plants" },
    { value: "commercial", label: "Commercial Plants" },
    { value: "residential-indoor", label: "Residential (Indoor)" },
    { value: "residential-outdoor", label: "Residential (Outdoor)" },
    { value: "beautification", label: "Beautification Plants" },
    { value: "flowering", label: "Flowering Plants" },
    { value: "fruit", label: "Fruit Plants" },
    { value: "industrial", label: "Industrial Plants" },
    { value: "landscaping-schools", label: "Schools & Hospitals" },
    { value: "landscaping-apartments", label: "Apartments" },
    { value: "landscaping-roads", label: "Roads & Avenues" }
  ];

  const filteredPlants = plants.filter(plant => {
    let matchesCategory = selectedCategory === "all";
    
    if (selectedCategory !== "all") {
      // Direct category matching - use the exact category values from database
      matchesCategory = plant.categories === selectedCategory;
      
      // If no direct match, try some common variations
      if (!matchesCategory) {
        switch (selectedCategory) {
          case "flowering":
            matchesCategory = plant.categories === "Flowering Plants" || plant.categories === "flowering" || plant.categories === "Flowering";
            break;
          case "fruit":
            matchesCategory = plant.categories === "Fruit Plants" || plant.categories === "fruit";
            break;
          case "beautification":
            matchesCategory = plant.categories === "Beautification Plants" || plant.categories === "beautification";
            break;
          case "residential-indoor":
            matchesCategory = plant.categories === "Residential (Indoor)" || plant.categories === "residential-indoor" || plant.categories === "Indoor";
            break;
          case "residential-outdoor":
            matchesCategory = plant.categories === "Residential (Outdoor)" || plant.categories === "residential-outdoor";
            break;
          case "commercial":
            matchesCategory = plant.categories === "Commercial Plants" || plant.categories === "commercial";
            break;
          case "industrial":
            matchesCategory = plant.categories === "Industrial Plants" || plant.categories === "industrial";
            break;
          case "landscaping-schools":
            matchesCategory = plant.categories === "Schools & Hospitals" || plant.categories === "landscaping-schools";
            break;
          case "landscaping-apartments":
            matchesCategory = plant.categories === "Apartments" || plant.categories === "landscaping-apartments";
            break;
          case "landscaping-roads":
            matchesCategory = plant.categories === "Roads & Avenues" || plant.categories === "landscaping-roads" || plant.categories === "Trees / Avenue Trees";
            break;
        }
      }
    }
    
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plant.description && plant.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Debug logging
    if (selectedCategory === "all") {
      console.log(`Plant "${plant.name}" - Category: ${plant.categories}, Search: "${searchTerm}", matchesSearch: ${matchesSearch}`);
    }
    
    return matchesCategory && matchesSearch;
  });

  const sortedPlants = [...filteredPlants].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Load wishlist on component mount
  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch wishlist from Supabase for logged-in user
          const { data, error } = await supabase
            .from('wishlist')
            .select('product_id')
            .eq('user_id', user.id);
          if (!error && data) {
            setWishlistItems(data.map((item: any) => item.product_id));
          } else {
            setWishlistItems([]);
          }
        } else {
          // Fallback to localStorage for guests
          try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            setWishlistItems(wishlist.map((item: any) => item.id));
          } catch (error) {
            setWishlistItems([]);
          }
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        setWishlistItems([]);
      }
    };

    loadWishlist().catch(error => {
      console.error('Unhandled promise rejection in loadWishlist:', error);
    });
    
    const handleWishlistUpdate = () => {
      loadWishlist().catch(error => {
        console.error('Unhandled promise rejection in wishlist update:', error);
      });
    };
    
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    };
  }, []);

  const addToWishlist = async (plant: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (wishlistItems.includes(plant.id)) {
          // Remove from Supabase
          await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', plant.id);
          setWishlistItems(prev => prev.filter(id => id !== plant.id));
          toast({
            title: "Removed from Wishlist",
            description: `${plant.name} has been removed from your wishlist.`,
          });
        } else {
          // Insert into Supabase
          const { error } = await supabase.from('wishlist').insert([
            { user_id: user.id, product_id: plant.id }
          ]);
          if (!error) {
            setWishlistItems(prev => [...prev, plant.id]);
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
        if (wishlistItems.includes(plant.id)) {
          const updatedWishlist = wishlist.filter((item: any) => item.id !== plant.id);
          localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
          setWishlistItems(prev => prev.filter(id => id !== plant.id));
          toast({
            title: "Removed from Wishlist",
            description: `${plant.name} has been removed from your wishlist.`,
          });
        } else {
          wishlist.push(plant);
          localStorage.setItem('wishlist', JSON.stringify(wishlist));
          setWishlistItems(prev => [...prev, plant.id]);
          toast({
            title: "Added to Wishlist",
            description: `${plant.name} has been added to your wishlist.`,
          });
        }
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      }
    } catch (error) {
      console.error('Error in addToWishlist:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCardClick = (plantId: number) => {
    navigate(`/product/${plantId}`);
  };

  useEffect(() => {
    // Update category when URL parameter changes
    if (initialCategory !== selectedCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    // Clear old cart data (with numeric ids)
    localStorage.removeItem('cart');
    
    const fetchProducts = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching products from database...');
        const { data, error } = await supabase.from('products').select('*');
        
        if (error) {
          console.error('❌ Error fetching plants:', error);
          toast({
            title: "Database Error",
            description: "Unable to load products. Please try refreshing the page.",
            variant: "destructive"
          });
          setPlants([]);
        } else if (data) {
          console.log('✅ Fetched plants:', data.length, 'plants');
          console.log('📋 Sample plants:', data.slice(0, 3));
          setPlants(data);
        } else {
          console.log('⚠️ No data returned from database');
          setPlants([]);
        }
      } catch (err) {
        console.error('💥 Unexpected error:', err);
        toast({
          title: "Connection Error",
          description: "Unable to connect to the database. Please check your internet connection.",
          variant: "destructive"
        });
        setPlants([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts().catch(error => {
      console.error('Unhandled promise rejection in fetchProducts:', error);
      setLoading(false);
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-emerald-800 mb-6 font-montserrat">
              Shop Premium Plants from Kadiyam
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto font-lora">
              Browse our extensive collection of plants, perfect for every use case from commercial spaces to residential gardens
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 bg-white border-b border-emerald-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search plants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-64 border-emerald-200 focus:border-gold-600 focus:ring-gold-600">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48 border-emerald-200 focus:border-gold-600 focus:ring-gold-600">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600 font-lora">
            Showing {sortedPlants.length} plants {selectedCategory !== "all" && `in ${categories.find(c => c.value === selectedCategory)?.label}`}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4">
          {sortedPlants.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
              {sortedPlants.map((plant, index) => (
                <Card
                  key={plant.id}
                  className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleCardClick(plant.id)}
                >
                  <div className="relative h-36 sm:h-56 overflow-hidden">
                    <img
                      src={plant.image_url && typeof plant.image_url === 'string' && (plant.image_url.startsWith('http') || plant.image_url.startsWith('/assets/'))
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
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${wishlistItems.includes(plant.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/90 text-gray-600 hover:bg-red-100'
                        }`}
                      onClick={(e) => addToWishlist(plant, e)}
                    >
                      <Heart className={`w-4 h-4 ${wishlistItems.includes(plant.id) ? 'fill-current' : ''}`} />
                    </button>
                    {!plant.available_quantity || plant.available_quantity === 0 ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold">Out of Stock</span>
                      </div>
                    ) : null}
                  </div>

                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-2">
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-xs">
                        {categories.find(c => c.value === plant.categories)?.label || plant.categories}
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
                        <span className="text-xl font-bold text-emerald-800 font-montserrat">{plant.price}</span>
                        {plant.originalPrice > plant.price && (
                          <span className="text-sm text-gray-500 line-through ml-2 font-montserrat">{plant.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="text-2xl font-bold text-gray-600 mb-4 font-montserrat">No plants found</h3>
                            <p className="text-gray-500 mb-8 font-lora">
                Try adjusting your search or filter criteria
              </p>
              <Button
                onClick={() => {
                  console.log('Show All Plants clicked - clearing filters');
                  setSelectedCategory("all");
                  setSearchTerm("");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-montserrat"
              >
                Show All Plants
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-4 font-montserrat">Nursery Shop</h3>
              <p className="text-emerald-200 mb-4 font-lora">
                Premium plants from Kadiyam, Andhra Pradesh, delivered across India.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Quick Links</h4>
              <ul className="space-y-2 text-emerald-200">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Our Plants</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Shop</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Plant Categories</h4>
              <ul className="space-y-2 text-emerald-200">
                <li><Link to="/plants" className="hover:text-white transition-colors">Ornamental Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Flowering Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Fruit Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Medicinal Plants</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Contact Info</h4>
              <div className="text-emerald-200 space-y-2 text-sm sm:text-base">
                <p>Kadiyam Nursery, Near Godavari Bridge</p>
                <p>Kadiyam, Andhra Pradesh 533126</p>
                <p>Phone: +91-9247777927</p>
                <p>WhatsApp: +91-9247777927</p>
                <p>Email: contact@nurseryshop.in</p>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-800 mt-8 pt-8 text-center text-emerald-200">
            <p className="text-sm sm:text-base font-lora">
              &copy; 2024 Nursery Shop. All rights reserved. | Kadiyam nursery, wholesale plants Andhra Pradesh, buy plants online India
            </p>
            <div className="mt-4 flex justify-center space-x-4 text-sm">
              <Link to="/privacy-policy" className="text-emerald-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-emerald-600">|</span>
              <Link to="/terms-of-service" className="text-emerald-300 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Shop;
