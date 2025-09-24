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
      quantity: "",
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
  const [plantImages, setPlantImages] = useState<{[key: number]: string}>({});
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: "",
    city: "",
    district: "",
    pincode: ""
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedSelectedPlants = localStorage.getItem('catalog_selected_plants');
    const savedDeliveryAddress = localStorage.getItem('catalog_delivery_address');
    
    if (savedSelectedPlants) {
      try {
        const parsedPlants = JSON.parse(savedSelectedPlants);
        setSelectedPlants(parsedPlants);
      } catch (error) {
        console.error('Error parsing saved plants:', error);
      }
    }
    
    if (savedDeliveryAddress) {
      try {
        const parsedAddress = JSON.parse(savedDeliveryAddress);
        setDeliveryAddress(parsedAddress);
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
    }
  }, []);

  // Save selected plants to localStorage whenever they change
  useEffect(() => {
    if (selectedPlants.length > 0) {
      localStorage.setItem('catalog_selected_plants', JSON.stringify(selectedPlants));
    }
  }, [selectedPlants]);

  // Save delivery address to localStorage whenever it changes
  useEffect(() => {
    if (deliveryAddress.address || deliveryAddress.city || deliveryAddress.district || deliveryAddress.pincode) {
      localStorage.setItem('catalog_delivery_address', JSON.stringify(deliveryAddress));
    }
  }, [deliveryAddress]);

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
    
    // Get and set plant image if value matches a known plant
    const plantImage = getPlantImage(value);
    setPlantImages(prev => ({ ...prev, [plantId]: plantImage }));
    
    // Find the index of the plant with this ID
    const plantIndex = selectedPlants.findIndex(p => p.id === plantId);
    if (plantIndex !== -1) {
      updatePlantSelection(plantIndex, "plantName", value);
    }
  };

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

  // Handle plant selection from dropdown
  const handlePlantSelect = (plantId: number, plantName: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setSearchInputs(prev => ({ ...prev, [plantId]: plantName }));
    setShowDropdowns(prev => ({ ...prev, [plantId]: false }));
    
    // Get and set plant image
    const plantImage = getPlantImage(plantName);
    setPlantImages(prev => ({ ...prev, [plantId]: plantImage }));
    
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
    return plant.plantName && plant.quantity && parseInt(plant.quantity) > 0 && plant.deliveryTimeline;
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
        description: "Please fill in the plant name, quantity, and delivery timeline for the current plant before adding another.",
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
    setPlantImages(prev => ({ ...prev, [newId]: '/assets/placeholder.svg' }));
  };

  const removePlantFromSelection = (index: number) => {
    const plantToRemove = selectedPlants[index];
    if (plantToRemove) {
      // Clean up state for the removed plant
      setSearchInputs(prev => {
        const newState = { ...prev };
        delete newState[plantToRemove.id];
        return newState;
      });
      setShowDropdowns(prev => {
        const newState = { ...prev };
        delete newState[plantToRemove.id];
        return newState;
      });
      setPlantImages(prev => {
        const newState = { ...prev };
        delete newState[plantToRemove.id];
        return newState;
      });
    }
    setSelectedPlants(selectedPlants.filter((_, i) => i !== index));
  };

  const updatePlantSelection = (index: number, field: string, value: any) => {
    const updatedPlants = [...selectedPlants];
    updatedPlants[index] = { ...updatedPlants[index], [field]: value };
    setSelectedPlants(updatedPlants);
  };

  const showQuotationSummary = async () => {
    const validPlants = selectedPlants.filter(plant => plant.plantName && plant.quantity && parseInt(plant.quantity) > 0);
    if (validPlants.length === 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select at least one plant with valid details.",
        variant: "destructive"
      });
      return;
    }
    
    // Load saved address if user is logged in
    if (user) {
      await loadSavedAddress();
    }
    
    setShowDeliveryModal(true);
  };

  const loadSavedAddress = async () => {
    // First check localStorage for any unsaved changes
    const savedAddress = localStorage.getItem('catalog_delivery_address');
    if (savedAddress) {
      try {
        const parsedAddress = JSON.parse(savedAddress);
        setDeliveryAddress(parsedAddress);
        return; // Use localStorage data if available
      } catch (error) {
        console.error('Error parsing saved address from localStorage:', error);
      }
    }
    
    // If no localStorage data and user is logged in, load from database
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('address')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.address) {
        // Parse the address string back to object format
        try {
          const parsedAddress = JSON.parse(data.address);
          setDeliveryAddress(parsedAddress);
          // Also save to localStorage for future use
          localStorage.setItem('catalog_delivery_address', JSON.stringify(parsedAddress));
        } catch (parseError) {
          // If parsing fails, treat as old format and create new structure
          const addressData = {
            address: data.address,
            city: "",
            district: "",
            pincode: ""
          };
          setDeliveryAddress(addressData);
          localStorage.setItem('catalog_delivery_address', JSON.stringify(addressData));
        }
      }
    } catch (error) {
      console.error('Error loading saved address:', error);
    }
  };

  const handleDeliveryAddressChange = (field: string, value: string) => {
    setDeliveryAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveDeliveryAddress = async () => {
    if (!user) return;
    
    try {
      // Convert address object to JSON string for storage
      const addressString = JSON.stringify(deliveryAddress);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          address: addressString
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Address Saved",
        description: "Delivery address has been saved to your profile.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive"
      });
    }
  };

  const proceedToSummary = () => {
    saveDeliveryAddress();
    setShowDeliveryModal(false);
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

    const validPlants = selectedPlants.filter(plant => plant.plantName && plant.quantity && parseInt(plant.quantity) > 0);
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

      // Clear localStorage after successful submission
      localStorage.removeItem('catalog_selected_plants');
      localStorage.removeItem('catalog_delivery_address');

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
        quantity: "",
        deliveryLocation: "",
        deliveryTimeline: "",
        notes: ""
      }]);
      setDeliveryAddress({
        address: "",
        city: "",
        district: "",
        pincode: ""
      });
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
                    <div className="flex gap-2">
                      <Button
                        onClick={addPlantToSelection}
                        disabled={!canAddPlant()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Plant
                      </Button>
                      {selectedPlants.length > 0 && (
                        <Button
                          onClick={() => {
                            // Clear localStorage
                            localStorage.removeItem('catalog_selected_plants');
                            localStorage.removeItem('catalog_delivery_address');
                            
                            // Reset all states
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
                            setDeliveryAddress({
                              address: "",
                              city: "",
                              district: "",
                              pincode: ""
                            });
                            setSearchInputs({ [newId]: "" });
                            setShowDropdowns({ [newId]: false });
                            setShowSummary(false);
                            setShowDeliveryModal(false);
                            
                            toast({
                              title: "Form Cleared",
                              description: "All form data has been cleared.",
                              variant: "default"
                            });
                          }}
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
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

                              {/* Plant Image Display */}
                              {plantImages[plant.id] && plantImages[plant.id] !== '/assets/placeholder.svg' && (
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plant Image
                                  </label>
                                  <div className="flex items-center space-x-4">
                                    <img
                                      src={plantImages[plant.id]}
                                      alt={plant.plantName || 'Selected plant'}
                                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                                      onError={(e) => {
                                        e.currentTarget.src = '/assets/placeholder.svg';
                                      }}
                                    />
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Selected:</span> {plant.plantName || 'No plant selected'}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Image will be displayed when you select a plant name
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

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

                            {/* Essential Plant Details */}
                            <div className="space-y-4">
                              <h5 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                                Plant Specifications
                              </h5>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Age
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
                                    Bag Size
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
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Height
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
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={plant.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d*$/.test(value)) {
                                        updatePlantSelection(index, "quantity", value);
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  />
                                </div>
                              </div>
                              
                              {/* Delivery Timeline */}
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Delivery Timeline *
                                </label>
                                <select
                                  value={plant.deliveryTimeline}
                                  onChange={(e) => updatePlantSelection(index, "deliveryTimeline", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                  <option value="">Select delivery timeline</option>
                                  <option value="Within 7 days">Within 7 days</option>
                                  <option value="Within 15 days">Within 15 days</option>
                                  <option value="Within 1 month">Within 1 month</option>
                                  <option value="Flexible">Flexible</option>
                                </select>
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

            {/* Delivery Address Modal */}
            {showDeliveryModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-emerald-800">
                        Delivery Address
                      </h2>
                      <Button
                        onClick={() => setShowDeliveryModal(false)}
                        variant="outline"
                        size="sm"
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address *
                        </label>
                        <textarea
                          value={deliveryAddress.address}
                          onChange={(e) => handleDeliveryAddressChange('address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          rows={3}
                          placeholder="Enter your complete address"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.city}
                            onChange={(e) => handleDeliveryAddressChange('city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Enter city"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            District *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.district}
                            onChange={(e) => handleDeliveryAddressChange('district', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Enter district"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pincode *
                        </label>
                        <input
                          type="text"
                          value={deliveryAddress.pincode}
                          onChange={(e) => handleDeliveryAddressChange('pincode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Enter pincode"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                      <Button
                        onClick={() => setShowDeliveryModal(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={proceedToSummary}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Proceed to Summary
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
                      {selectedPlants.filter(plant => plant.plantName && plant.quantity && parseInt(plant.quantity) > 0).map((plant, index) => (
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

      {/* Catalog Grid - HIDDEN */}
      {/* Plant category cards have been hidden as requested */}
      
      {/* Delivery Information - HIDDEN */}
      {/* Delivery information section has been hidden as requested */}



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
