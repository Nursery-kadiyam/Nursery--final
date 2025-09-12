import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Leaf, Star, Filter, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Catalog = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPlantForm, setShowPlantForm] = useState(true);
  const [selectedPlants, setSelectedPlants] = useState<any[]>([
    {
      id: Date.now(),
      plantName: "",
      variety: "",
      plantType: "",
      ageCategory: "",
      heightRange: "",
      stemThickness: "",
      isGrafted: false,
      bagSize: "",
      quantity: 1,
      deliveryLocation: "",
      deliveryTimeline: "",
      notes: ""
    }
  ]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [searchInputs, setSearchInputs] = useState<{[key: number]: string}>({});
  const [showDropdowns, setShowDropdowns] = useState<{[key: number]: boolean}>({});
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch real-time products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching products:', error);
          toast({
            title: "Error",
            description: "Failed to load products. Please try again.",
            variant: "destructive"
          });
        } else {
          setProducts(data || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  // Initialize search input state for all plants
  useEffect(() => {
    if (selectedPlants.length > 0) {
      const newSearchInputs: {[key: number]: string} = {};
      const newShowDropdowns: {[key: number]: boolean} = {};
      
      selectedPlants.forEach(plant => {
        newSearchInputs[plant.id] = plant.plantName || "";
        newShowDropdowns[plant.id] = false;
      });
      
      setSearchInputs(newSearchInputs);
      setShowDropdowns(newShowDropdowns);
    }
  }, [selectedPlants.length]);

  // Filter products based on search input
  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return products;
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle search input change
  const handleSearchInputChange = (plantId: number, value: string) => {
    setSearchInputs(prev => ({ ...prev, [plantId]: value }));
    setShowDropdowns(prev => ({ ...prev, [plantId]: true }));
    
    // Find the index of the plant with this ID
    const plantIndex = selectedPlants.findIndex(p => p.id === plantId);
    if (plantIndex !== -1) {
      updatePlantSelection(plantIndex, "plantName", value);
    }
  };

  // Handle plant selection from dropdown
  const handlePlantSelect = (plantId: number, plantName: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setSearchInputs(prev => ({ ...prev, [plantId]: plantName }));
    setShowDropdowns(prev => ({ ...prev, [plantId]: false }));
    
    // Find the index of the plant with this ID
    const plantIndex = selectedPlants.findIndex(p => p.id === plantId);
    if (plantIndex !== -1) {
      updatePlantSelection(plantIndex, "plantName", plantName);
    }
  };

  // Handle input focus
  const handleInputFocus = (plantId: number) => {
    setShowDropdowns(prev => ({ ...prev, [plantId]: true }));
  };

  // Handle input blur (with delay to allow clicking on dropdown items)
  const handleInputBlur = (plantId: number) => {
    setTimeout(() => {
      setShowDropdowns(prev => ({ ...prev, [plantId]: false }));
    }, 300);
  };

  const categories = [
    {
      id: "commercial",
      name: "Commercial Plants",
      description: "Elevate offices, malls, and commercial spaces with low-maintenance, aesthetic plants that enhance ambiance and air quality for professional environments.",
      examples: ["Areca Palm", "Ficus", "Dracaena", "Money Plant", "ZZ Plant"],
      image: "photo-1441986300917-64674bd600d8",
      color: "emerald",
      count: "180+"
    },
    {
      id: "residential-indoor",
      name: "Residential Plants (Indoor)",
      description: "Transform your home with air-purifying indoor plants that bring nature indoors while improving air quality and creating a peaceful atmosphere.",
      examples: ["Snake Plant", "Peace Lily", "Pothos", "Spider Plant", "Rubber Plant"],
      image: "photo-1469474968028-56623f02e42e",
      color: "gold",
      count: "120+"
    },
    {
      id: "residential-outdoor",
      name: "Residential Plants (Outdoor)",
      description: "Create vibrant outdoor gardens with flowering and foliage plants perfect for balconies, terraces, and home gardens in any climate.",
      examples: ["Hibiscus", "Bougainvillea", "Rose", "Jasmine", "Croton"],
      image: "photo-1465146344425-f00d5f5c8f07",
      color: "emerald",
      count: "200+"
    },
    {
      id: "beautification",
      name: "Beautification Plants",
      description: "Add vibrant colors and stunning textures to gardens, parks, or event venues with ornamental and flowering plants that create visual impact.",
      examples: ["Croton", "Rose", "Marigold", "Coleus", "Ixora"],
      image: "photo-1509316975850-ff9c5deb0cd9",
      color: "gold",
      count: "150+"
    },
    {
      id: "industrial",
      name: "Industrial Plants",
      description: "Durable, low-maintenance plants perfect for industrial estates and factories, ideal for greening initiatives and dust control in harsh environments.",
      examples: ["Neem", "Bamboo", "Ashoka", "Pongamia", "Cassia"],
      image: "photo-1518495973542-4542c06a5843",
      color: "emerald",
      count: "80+"
    },
    {
      id: "landscaping-schools",
      name: "Schools, Assembly Buildings & Hospitals",
      description: "Safe, aesthetic, and air-purifying plants perfect for educational institutions, public buildings, and healthcare facilities with focus on safety.",
      examples: ["Royal Palm", "Tulsi", "Pothos", "Ashoka", "Curry Leaves"],
      image: "photo-1523050854058-8df90110c9d1",
      color: "gold",
      count: "90+"
    },
    {
      id: "landscaping-apartments",
      name: "Apartment Landscaping",
      description: "Compact plants perfect for apartment balconies, vertical gardens, and rooftops, designed for space-efficient urban living environments.",
      examples: ["Ferns", "Succulents", "Dwarf Mango", "Mint", "Cherry Tomato"],
      image: "photo-1487958449943-2429e8be8625",
      color: "emerald",
      count: "100+"
    },
    {
      id: "landscaping-roads",
      name: "Road & Avenue Landscaping",
      description: "Sturdy avenue trees and shrubs for roadside planting, medians, and urban greening projects, focusing on durability and shade provision.",
      examples: ["Gulmohar", "Cassia", "Royal Palm", "Banyan", "Peepal"],
      image: "photo-1513836279014-a89f7a76ae86",
      color: "gold",
      count: "70+"
    }
  ];

  const filteredCategories = selectedCategory === "all"
    ? categories
    : categories.filter(cat => cat.id === selectedCategory);

  // Check if a plant form is completely filled
  const isPlantFormComplete = (plant: any) => {
    return plant.plantName && plant.quantity > 0;
  };

  // Check if we can add another plant (current plant must be complete)
  const canAddPlant = () => {
    if (selectedPlants.length === 0) return true;
    const lastPlant = selectedPlants[selectedPlants.length - 1];
    return isPlantFormComplete(lastPlant);
  };

  const addPlantToSelection = () => {
    if (!canAddPlant()) {
      toast({
        title: "Complete Current Plant",
        description: "Please fill in the plant name and quantity for the current plant before adding another.",
        variant: "destructive"
      });
      return;
    }

    const newId = Date.now();
    setSelectedPlants([...selectedPlants, {
      id: newId,
      plantName: "",
      variety: "",
      plantType: "",
      ageCategory: "",
      heightRange: "",
      stemThickness: "",
      isGrafted: false,
      bagSize: "",
      quantity: 1,
      deliveryLocation: "",
      deliveryTimeline: "",
      notes: ""
    }]);
    
    // Initialize search input state for the new plant
    setSearchInputs(prev => ({ ...prev, [newId]: "" }));
    setShowDropdowns(prev => ({ ...prev, [newId]: false }));
  };

  const removePlantFromSelection = (index: number) => {
    setSelectedPlants(selectedPlants.filter((_, i) => i !== index));
  };

  const updatePlantSelection = (index: number, field: string, value: any) => {
    const updatedPlants = [...selectedPlants];
    updatedPlants[index] = { ...updatedPlants[index], [field]: value };
    setSelectedPlants(updatedPlants);
  };

  const showQuotationSummary = () => {
    const validPlants = selectedPlants.filter(plant => plant.plantName && plant.quantity > 0);
    if (validPlants.length === 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select at least one plant with valid details.",
        variant: "destructive"
      });
      return;
    }
    setShowSummary(true);
  };

  const submitQuotation = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit quotations.",
        variant: "destructive"
      });
      return;
    }

    const validPlants = selectedPlants.filter(plant => plant.plantName && plant.quantity > 0);
    if (validPlants.length === 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select at least one plant with valid details.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create a single quotation with multiple items
      const quotationData = {
        items: validPlants.map(plant => ({
          product_id: null, // No specific product ID for catalog quotations
          product_name: plant.plantName,
          variety: plant.variety,
          plant_type: plant.plantType,
          age_category: plant.ageCategory,
          height_range: plant.heightRange,
          stem_thickness: plant.stemThickness,
          is_grafted: plant.isGrafted,
          bag_size: plant.bagSize,
          quantity: plant.quantity,
          delivery_location: plant.deliveryLocation,
          delivery_timeline: plant.deliveryTimeline,
          notes: plant.notes
        }))
      };

      // Call the quotation creation function (same as individual plant flow)
      const { data, error } = await supabase.rpc('create_user_quotation_request', {
        p_user_id: user.id,
        p_user_email: user.email,
        p_items: quotationData.items
      });

      if (error) {
        console.error('Error creating quotation request:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to submit quotation request.");
      }

      toast({
        title: "Quotation Request Submitted!",
        description: `Your quotation request with ${validPlants.length} plant${validPlants.length > 1 ? 's' : ''} has been submitted. Merchants will respond with their prices.`,
      });

      // Reset form
      const newId = Date.now();
      setSelectedPlants([{
        id: newId,
        plantName: "",
        variety: "",
        plantType: "",
        ageCategory: "",
        heightRange: "",
        stemThickness: "",
        isGrafted: false,
        bagSize: "",
        quantity: 1,
        deliveryLocation: "",
        deliveryTimeline: "",
        notes: ""
      }]);
      setShowSummary(false);
      
      // Reset search states
      setSearchInputs({ [newId]: "" });
      setShowDropdowns({ [newId]: false });

    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to submit quotation request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <Leaf className="w-6 sm:w-8 h-6 sm:h-8 text-emerald-600 mr-3" />
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-emerald-800 font-montserrat">
                Discover Plants for Every Purpose at Kadiyam Nursery
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto font-lora">
              From commercial spaces to residential gardens, explore our 1000+ plant varieties
              cultivated in Kadiyam's fertile Godavari soil, delivered pan-India
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-emerald-700">
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">1000+ Plant Varieties</span>
              </div>
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">Use-Case Specific Selection</span>
              </div>
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">Expert Cultivation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plant Selection Form */}
      <section className="py-8 bg-emerald-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-4">
                🌱 Multi-Plant Selection Form
              </h2>
              <p className="text-gray-600 mb-6">
                Submit comprehensive quotations for multiple plants with detailed specifications
              </p>
              <Button
                onClick={() => setShowPlantForm(!showPlantForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {showPlantForm ? "Hide Form" : "Show Plant Selection Form"}
              </Button>
            </div>

            {showPlantForm && (
              <Card className="bg-white shadow-lg border-emerald-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-emerald-800">
                      Select Plants
                    </h3>
                    <Button
                      onClick={addPlantToSelection}
                      disabled={!canAddPlant()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Plant
                    </Button>
                  </div>

                  {selectedPlants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Click "Add Plant" to start selecting plants
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedPlants.map((plant, index) => {
                        return (
                          <div key={plant.id} className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="font-semibold text-emerald-800">
                                Plant {index + 1}
                              </h4>
                              <Button
                                onClick={() => removePlantFromSelection(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Plant Information Section */}
                            <div className="space-y-4">
                              <h5 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                                Plant Information
                              </h5>
                              
                              {/* Plant Name - Searchable Input */}
                              <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Plant Name *
                                </label>
                                <input
                                  type="text"
                                  value={searchInputs[plant.id] || plant.plantName || ""}
                                  onChange={(e) => handleSearchInputChange(plant.id, e.target.value)}
                                  onFocus={() => handleInputFocus(plant.id)}
                                  onBlur={() => handleInputBlur(plant.id)}
                                  placeholder="Type to search plants..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                
                                {/* Dropdown with filtered results */}
                                {showDropdowns[plant.id] && getFilteredProducts(searchInputs[plant.id] || "").length > 0 && (
                                  <div 
                                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    {getFilteredProducts(searchInputs[plant.id] || "").map((product) => (
                                      <div
                                        key={product.id}
                                        onMouseDown={(e) => handlePlantSelect(plant.id, product.name, e)}
                                        className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="font-medium text-gray-900">{product.name}</div>
                                        {product.category && (
                                          <div className="text-sm text-gray-500">{product.category}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* No results message */}
                                {showDropdowns[plant.id] && searchInputs[plant.id] && getFilteredProducts(searchInputs[plant.id]).length === 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                    <div className="px-3 py-2 text-gray-500 text-sm">
                                      No plants found matching "{searchInputs[plant.id]}"
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Variety and Plant Type */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Variety / Hybrid
                              </label>
                              <input
                                type="text"
                                    value={plant.variety}
                                    onChange={(e) => updatePlantSelection(index, "variety", e.target.value)}
                                    placeholder="e.g., Banganapalli Mango"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plant Type
                                  </label>
                                  <select
                                    value={plant.plantType}
                                    onChange={(e) => updatePlantSelection(index, "plantType", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  >
                                    <option value="">Select type</option>
                                    <option value="Fruit">Fruit</option>
                                    <option value="Ornamental/Flowering">Ornamental/Flowering</option>
                                    <option value="Timber">Timber</option>
                                    <option value="Avenue">Avenue</option>
                                    <option value="Medicinal">Medicinal</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Growth/Age Details Section */}
                            <div className="space-y-4">
                              <h5 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                                Growth / Age Details
                              </h5>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Age Category
                                  </label>
                                  <select
                                    value={plant.ageCategory}
                                    onChange={(e) => updatePlantSelection(index, "ageCategory", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  >
                                    <option value="">Select age</option>
                                    <option value="6 months">6 months</option>
                                    <option value="1 year">1 year</option>
                                    <option value="2 years">2 years</option>
                                    <option value="3+ years">3+ years</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Height Range
                                  </label>
                                  <select
                                    value={plant.heightRange}
                                    onChange={(e) => updatePlantSelection(index, "heightRange", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  >
                                    <option value="">Select height</option>
                                    <option value="1-2 ft">1-2 ft</option>
                                    <option value="3-4 ft">3-4 ft</option>
                                    <option value="5-6 ft">5-6 ft</option>
                                    <option value=">6 ft">&gt;6 ft</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Stem Thickness (optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={plant.stemThickness}
                                    onChange={(e) => updatePlantSelection(index, "stemThickness", e.target.value)}
                                    placeholder="e.g., 2-3 cm"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bag/Pot Size
                                  </label>
                                  <select
                                    value={plant.bagSize}
                                    onChange={(e) => updatePlantSelection(index, "bagSize", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  >
                                    <option value="">Select size</option>
                                      <option value="6&quot;">6&quot;</option>
                                      <option value="8&quot;">8&quot;</option>
                                      <option value="12&quot;">12&quot;</option>
                                      <option value="16&quot;">16&quot;</option>
                                    <option value="ground-grown">Ground-grown</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`grafted-${index}`}
                                  checked={plant.isGrafted}
                                  onChange={(e) => updatePlantSelection(index, "isGrafted", e.target.checked)}
                                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`grafted-${index}`} className="text-sm font-medium text-gray-700">
                                  Grafted / Seedling
                                </label>
                              </div>
                            </div>

                            {/* Quantity & Delivery Section */}
                            <div className="space-y-4">
                              <h5 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                                Quantity & Delivery
                              </h5>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantity Required *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={plant.quantity}
                                  onChange={(e) => updatePlantSelection(index, "quantity", parseInt(e.target.value) || 1)}
                                  className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Timeline
                                </label>
                                <select
                                    value={plant.deliveryTimeline}
                                    onChange={(e) => updatePlantSelection(index, "deliveryTimeline", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">Select timeline</option>
                                    <option value="Within 7 days">Within 7 days</option>
                                    <option value="Within 15 days">Within 15 days</option>
                                    <option value="Within 1 month">Within 1 month</option>
                                    <option value="Flexible">Flexible</option>
                                </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Delivery Location
                                </label>
                                <input
                                  type="text"
                                  value={plant.deliveryLocation}
                                  onChange={(e) => updatePlantSelection(index, "deliveryLocation", e.target.value)}
                                  placeholder="City, District, Pin Code"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Notes (Optional)
                                </label>
                                <textarea
                                  value={plant.notes}
                                  onChange={(e) => updatePlantSelection(index, "notes", e.target.value)}
                                  placeholder="e.g., Require uniform height, bulk plantation use, roadside landscaping"
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                              </div>
                            </div>


                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedPlants.length > 0 && (
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={showQuotationSummary}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Review & Submit Quotation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quotation Summary Modal */}
            {showSummary && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-emerald-800">
                        Quotation Summary
                      </h2>
                      <Button
                        onClick={() => setShowSummary(false)}
                        variant="outline"
                        size="sm"
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {selectedPlants.filter(plant => plant.plantName && plant.quantity > 0).map((plant, index) => (
                        <div key={plant.id} className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                          <h3 className="text-lg font-semibold text-emerald-800 mb-4">
                            Plant {index + 1}: {plant.plantName}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              {plant.variety && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Variety:</span>
                                  <span className="font-medium">{plant.variety}</span>
                                </div>
                              )}
                              {plant.plantType && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <span className="font-medium">{plant.plantType}</span>
                                </div>
                              )}
                              {plant.ageCategory && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Age:</span>
                                  <span className="font-medium">{plant.ageCategory}</span>
                                </div>
                              )}
                              {plant.heightRange && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Height:</span>
                                  <span className="font-medium">{plant.heightRange}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {plant.stemThickness && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Stem Thickness:</span>
                                  <span className="font-medium">{plant.stemThickness}</span>
                                </div>
                              )}
                              {plant.bagSize && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Bag Size:</span>
                                  <span className="font-medium">{plant.bagSize}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">Grafted:</span>
                                <span className="font-medium">{plant.isGrafted ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-bold text-emerald-600">{plant.quantity}</span>
                              </div>
                            </div>
                          </div>

                          {(plant.deliveryLocation || plant.deliveryTimeline) && (
                            <div className="mt-4 pt-4 border-t border-emerald-200">
                              <h4 className="font-semibold text-emerald-800 mb-2">Delivery Details</h4>
                              <div className="space-y-1">
                                {plant.deliveryLocation && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Location:</span>
                                    <span className="font-medium">{plant.deliveryLocation}</span>
                                  </div>
                                )}
                                {plant.deliveryTimeline && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Timeline:</span>
                                    <span className="font-medium">{plant.deliveryTimeline}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {plant.notes && (
                            <div className="mt-4 pt-4 border-t border-emerald-200">
                              <h4 className="font-semibold text-emerald-800 mb-2">Notes</h4>
                              <p className="text-gray-700">{plant.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <Button
                        onClick={() => setShowSummary(false)}
                        variant="outline"
                      >
                        Edit Quotation
                      </Button>
                      <Button
                        onClick={submitQuotation}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Submit Quotation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Table */}
            {cartItems.length > 0 && (
              <div className="mt-8">
                <Card className="bg-white shadow-lg border-emerald-200">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-emerald-800 mb-4">
                      🛒 Cart Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-emerald-200">
                        <thead>
                          <tr className="bg-emerald-50">
                            <th className="border border-emerald-200 px-4 py-2 text-left font-semibold text-emerald-800">
                              Plant Name
                            </th>
                            <th className="border border-emerald-200 px-4 py-2 text-left font-semibold text-emerald-800">
                              Quantity
                            </th>
                            <th className="border border-emerald-200 px-4 py-2 text-left font-semibold text-emerald-800">
                              Year Old
                            </th>
                            <th className="border border-emerald-200 px-4 py-2 text-left font-semibold text-emerald-800">
                              Size
                            </th>
                            <th className="border border-emerald-200 px-4 py-2 text-left font-semibold text-emerald-800">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((item) => (
                            <tr key={item.id} className="hover:bg-emerald-50">
                              <td className="border border-emerald-200 px-4 py-2 font-medium">
                                {item.name}
                              </td>
                              <td className="border border-emerald-200 px-4 py-2">
                                {item.quantity}
                              </td>
                              <td className="border border-emerald-200 px-4 py-2">
                                {item.yearOld ? `${item.yearOld} Years` : "-"}
                              </td>
                              <td className="border border-emerald-200 px-4 py-2">
                                {item.size || "-"}
                              </td>
                              <td className="border border-emerald-200 px-4 py-2">
                                <Button
                                  onClick={() => removeFromCart(item.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter Section */}
      {/* (Filter section removed) */}

      {/* Catalog Grid */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCategories.map((category, index) => (
              <Card
                key={category.id}
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-3 overflow-hidden animate-fade-in bg-white"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative h-48 sm:h-64 overflow-hidden">
                  <img
                    src={`https://images.unsplash.com/${category.image}?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80`}
                    alt={`${category.name} from Kadiyam Nursery`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                  <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold font-montserrat ${category.color === 'emerald'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gold-500 text-white'
                      }`}>
                      {category.count} Varieties
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-white/90 text-emerald-800 px-2 py-1 rounded-full text-xs font-semibold font-montserrat">
                      Use Case Specific
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-800 mb-3 group-hover:text-gold-600 transition-colors font-montserrat">
                    {category.name}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed text-sm sm:text-base font-lora">
                    {category.description}
                  </p>

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-emerald-700 mb-2 font-montserrat">Popular Varieties:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.examples.map((example, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-montserrat hover:bg-emerald-200 transition-colors"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <a
                      href={category.id === 'commercial'
                        ? "/assets/fruit%20plant%20pdf.pdf"
                        : category.id === 'residential-indoor'
                          ? "/assets/Air%20Purifying%20Plants%20Catalog.pdf"
                          : category.id === 'residential-outdoor'
                            ? "/assets/Cactus%20and%20Succulents%20Catalog.pdf"
                            : "/assets/catalog.pdf"}
                      download={category.id === 'commercial'
                        ? "Commercial-Plants.pdf"
                        : category.id === 'residential-indoor'
                          ? "Air-Purifying-Plants-Catalog.pdf"
                          : category.id === 'residential-outdoor'
                            ? "Cactus-and-Succulents-Catalog.pdf"
                            : undefined}
                      className="flex-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        className={`w-full ${['commercial', 'residential-indoor', 'residential-outdoor'].includes(category.id) ? 'bg-emerald-600' : 'bg-gold-600'} text-white hover:bg-gold-700 transition-all duration-300 min-h-[48px] font-montserrat`}
                      >
                        Download
                      </Button>
                    </a>
                    <a
                      href={category.id === 'commercial'
                        ? "/assets/fruit%20plant%20pdf.pdf"
                        : category.id === 'residential-indoor'
                          ? "/assets/Air%20Purifying%20Plants%20Catalog.pdf"
                          : category.id === 'residential-outdoor'
                            ? "/assets/Cactus%20and%20Succulents%20Catalog.pdf"
                            : undefined}
                      target={['commercial', 'residential-indoor', 'residential-outdoor'].includes(category.id) ? "_blank" : undefined}
                      rel={['commercial', 'residential-indoor', 'residential-outdoor'].includes(category.id) ? "noopener noreferrer" : undefined}
                      className="flex-1"
                      {...(!['commercial', 'residential-indoor', 'residential-outdoor'].includes(category.id) ? { as: Link, to: '/plants' } : {})}
                    >
                      <Button
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-300 min-h-[48px] font-montserrat"
                      >
                        Learn More
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Delivery Information */}
          <div className="mt-12 sm:mt-16 text-center animate-fade-in">
            <Card className="bg-emerald-50 border-emerald-200 shadow-lg max-w-4xl mx-auto">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">
                  Pan-India Delivery for Every Use Case
                </h3>
                <p className="text-gray-600 mb-4 font-lora">
                  Whether it's for commercial spaces, homes, or large projects, we deliver nationwide
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-emerald-700 font-montserrat">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">eKart</span>
                    <span className="text-xs">Express Delivery</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">Delhivery</span>
                    <span className="text-xs">Reliable Service</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">India Post</span>
                    <span className="text-xs">Nationwide Reach</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">Shiprocket</span>
                    <span className="text-xs">Fast & Secure</span>
                  </div>
                </div>
                <p className="text-emerald-600 font-semibold mt-4 font-montserrat">
                  Estimated Delivery: 3–7 Days | Free Shipping over ₹1499
                </p>
              </CardContent>
            </Card>
          </div>
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
              <div className="text-emerald-200 space-y-2">
                <p>Kadiyam, Andhra Pradesh, India</p>
                <p>Phone: +91-98765-43210</p>
                <p>Email: info@kadiyamnursery.com</p>
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

export default Catalog;
