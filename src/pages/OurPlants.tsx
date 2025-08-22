import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Leaf, Star, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";

const OurPlants = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState("all");

  const categories = [
    {
      id: 1,
      name: "Ornamental Plants",
      filterValue: "beautification",
      description: "Beautiful decorative plants that add elegance and color to any space",
      examples: ["Croton", "Bougainvillea", "Coleus", "Ixora"],
      image: "photo-1509316975850-ff9c5deb0cd9",
      color: "emerald"
    },
    {
      id: 2,
      name: "Flowering Plants",
      filterValue: "flowering",
      description: "Vibrant blooming plants that bring joy and fragrance to your garden",
      examples: ["Hibiscus", "Rose", "Jasmine", "Marigold"],
      image: "photo-1465146344425-f00d5f5c8f07",
      color: "gold"
    },
    {
      id: 3,
      name: "Fruit Plants",
      filterValue: "fruit",
      description: "Fresh, organic fruit plants for homegrown healthy produce",
      examples: ["Mango", "Guava", "Lemon", "Pomegranate"],
      image: "photo-1513836279014-a89f7a76ae86",
      color: "emerald"
    },
    {
      id: 4,
      name: "Avenue & Shade Trees",
      filterValue: "landscaping-roads",
      description: "Large trees perfect for landscaping and providing natural shade",
      examples: ["Neem", "Royal Palm", "Banyan", "Gulmohar"],
      image: "photo-1518495973542-4542c06a5843",
      color: "gold"
    },
    {
      id: 5,
      name: "Indoor & Air-Purifying",
      filterValue: "residential-indoor",
      description: "Perfect indoor plants that purify air and enhance your living space",
      examples: ["Snake Plant", "Peace Lily", "Money Plant", "Spider Plant"],
      image: "photo-1469474968028-56623f02e42e",
      color: "emerald"
    },
    {
      id: 6,
      name: "Medicinal & Herbal",
      filterValue: "landscaping-schools",
      description: "Traditional medicinal plants with therapeutic and healing properties",
      examples: ["Aloe Vera", "Tulsi", "Mint", "Curry Leaves"],
      image: "photo-1512090622910-d4b9d37e2ac8",
      color: "gold"
    }
  ];

  const handleCategoryClick = (filterValue: string) => {
    navigate(`/shop?category=${filterValue}`);
  };

  const handleFilterClick = (filterValue: string) => {
    setSelectedFilter(filterValue);
    if (filterValue !== "all") {
      navigate(`/shop?category=${filterValue}`);
    } else {
      navigate("/shop");
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
                Categories
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto font-lora">
              From ornamental beauties to medicinal herbs, discover our carefully curated selection
              of premium plants from the heart of Kadiyam, Andhra Pradesh
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-emerald-700">
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">Premium Quality</span>
              </div>
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">1000+ Varieties</span>
              </div>
              <div className="flex items-center min-h-[44px]">
                <Star className="w-4 h-4 mr-1" />
                <span className="font-montserrat">Pan-India Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Buttons */}
      {/* (Filter section removed) */}

      {/* Plant Categories */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-emerald-800 mb-4 font-montserrat">Plant Categories</h2>
            <p className="text-gray-600 font-lora">Click on any category to view related plants</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category, index) => (
              <Card
                key={category.id}
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-3 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleCategoryClick(category.filterValue)}
              >
                <div className="relative h-48 sm:h-64 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{
                      backgroundImage: `url('https://images.unsplash.com/${category.image}?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')`
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                  <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold font-montserrat ${category.color === 'emerald'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gold-500 text-white'
                      }`}>
                      Premium Collection
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
                    <div className="flex flex-wrap gap-2">
                      {category.examples.map((example, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-montserrat"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gold-600 hover:bg-gold-700 text-white transition-all duration-300 group-hover:scale-105 min-h-[48px] font-montserrat hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(category.filterValue);
                    }}
                  >
                    View Plants
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
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

export default OurPlants;
