import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Leaf, Star, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";

const Catalog = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

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

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-emerald-600 to-emerald-800">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 font-montserrat">
              Need Expert Advice for Your Specific Use Case?
            </h2>
            <p className="text-lg sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto font-lora">
              Our team specializes in recommending the perfect plants for commercial, residential, industrial, and landscaping projects
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/contact">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-gray-100 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  Get Expert Consultation
                </Button>
              </Link>
              <Link to="/shop">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  Browse All Plants
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Catalog;
