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
    { value: "industrial", label: "Industrial Plants" },
    { value: "landscaping-schools", label: "Schools & Hospitals" },
    { value: "landscaping-apartments", label: "Apartments" },
    { value: "landscaping-roads", label: "Roads & Avenues" }
  ];

  const filteredPlants = plants.filter(plant => {
    let matchesCategory = selectedCategory === "all";
    if (selectedCategory === "ornamental-plants") {
      matchesCategory = plant.category === "Ornamental Plants";
    } else if (selectedCategory !== "all") {
      matchesCategory = plant.category === selectedCategory;
    }
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.description.toLowerCase().includes(searchTerm.toLowerCase());
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
    };

    loadWishlist();
    window.addEventListener('wishlist-updated', loadWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', loadWishlist);
    };
  }, []);

  const addToWishlist = async (plant: any, e: React.MouseEvent) => {
    e.stopPropagation();
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
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) {
        setPlants(data);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

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
                        {categories.find(c => c.value === plant.category)?.label || plant.category}
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
              <p className="text-gray-500 mb-8 font-lora">Try adjusting your search or filter criteria</p>
              <Button
                onClick={() => {
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

      {/* Call to Action */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-emerald-600 to-emerald-800">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 font-montserrat">
              Need Help Finding the Right Plants?
            </h2>
            <p className="text-lg sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto font-lora">
              Our experts are here to help you choose the perfect plants for your specific needs
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/contact">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-gray-100 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  Get Expert Advice
                </Button>
              </Link>
              <Link to="/cart">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  View Cart
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;
