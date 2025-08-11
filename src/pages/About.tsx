import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Award, MapPin, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";

const About = () => {
  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen bg-cover bg-center bg-no-repeat flex items-center pt-16 sm:pt-20">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3)), url('https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white animate-fade-in">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight font-montserrat">
              Rooted in Kadiyam's{" "}
              <span className="text-gold-400">Green Legacy</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-4 text-emerald-100 font-medium font-lora">
              Three Decades of Nurturing Nature's Best
            </p>
            <p className="text-base sm:text-lg md:text-xl mb-8 text-gray-200 max-w-3xl mx-auto font-lora">
              From the fertile soils of Godavari to gardens across India, we've been cultivating excellence for over 30 years
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Our Green Journey
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-lora">
              A family legacy rooted in passion, nurtured by expertise, and grown with love
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="animate-slide-in-left">
              <div
                className="relative h-64 sm:h-96 rounded-lg overflow-hidden shadow-xl group cursor-pointer"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-white">
                  <h3 className="text-lg sm:text-2xl font-bold mb-2 font-montserrat">Kadiyam's Fertile Heritage</h3>
                  <p className="text-emerald-100 text-sm sm:text-base font-lora">Where the Godavari's blessings meet generations of expertise</p>
                </div>
              </div>
            </div>

            <div className="animate-slide-in-right">
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-6 font-montserrat">
                From Humble Roots to India's Trust
              </h3>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed font-lora">
                Nestled in the heart of Kadiyam, Andhra Pradesh—known as India's nursery capital—our family-run business has been nurturing nature's finest for over three decades. What started as a small venture has blossomed into one of the region's most trusted plant nurseries.
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed font-lora">
                The fertile alluvial soil of the Godavari delta provides the perfect foundation for our plants to thrive. This natural advantage, combined with our deep understanding of horticulture, ensures that every plant we cultivate meets the highest standards of quality and vitality.
              </p>
              <div className="flex items-center space-x-4 text-emerald-700">
                <Award className="w-6 sm:w-8 h-6 sm:h-8" />
                <span className="text-base sm:text-lg font-semibold font-montserrat">30+ Years of Excellence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Growing Through the Years
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 sm:space-y-12">
              {[
                {
                  year: "1990s",
                  title: "The Beginning",
                  description: "Started as a small family nursery in Kadiyam, focusing on local ornamental plants and traditional varieties with deep roots in agricultural heritage.",
                  image: "photo-1518495973542-4542c06a5843",
                  alt: "Kadiyam Nursery traditional planting in 1990s"
                },
                {
                  year: "2000s",
                  title: "Expanding Horizons",
                  description: "Introduced exotic plant varieties and began serving landscapers and commercial projects across Andhra Pradesh, establishing our reputation for quality.",
                  image: "photo-1465146344425-f00d5f5c8f07",
                  alt: "Kadiyam Nursery expansion with flowering plants in 2000s"
                },
                {
                  year: "2010s",
                  title: "National Recognition",
                  description: "Expanded to serve hotels, government projects, and gardening enthusiasts across India with our premium plant collection and expert cultivation techniques.",
                  image: "photo-1501854140801-50d01698950b",
                  alt: "Kadiyam Nursery national projects and recognition in 2010s"
                },
                {
                  year: "Today",
                  title: "Digital Growth",
                  description: "Leveraging technology to bring Kadiyam's finest plants to doorsteps nationwide, maintaining our commitment to quality while embracing modern e-commerce.",
                  image: "photo-1615729947596-a598e5de0ab3",
                  alt: "Kadiyam Nursery modern digital operations and delivery"
                }
              ].map((milestone, index) => (
                <div key={index} className={`flex flex-col lg:flex-row items-center gap-6 sm:gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''} animate-fade-in`}>
                  <div className="w-full lg:w-1/2">
                    <div
                      className="relative h-48 sm:h-64 rounded-lg overflow-hidden shadow-xl group cursor-pointer"
                    >
                      <img
                        src={`https://images.unsplash.com/${milestone.image}?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80`}
                        alt={milestone.alt}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
                      <div className="absolute top-4 left-4">
                        <div className="bg-gold-600 text-white px-3 py-1 rounded-full text-sm font-semibold font-montserrat">
                          {milestone.year}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/2 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-4 font-montserrat">{milestone.title}</h3>
                    <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-lora">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Our Mission & Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-in-left">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Leaf className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Quality First</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  Every plant is carefully nurtured in our fertile Godavari soil, ensuring the highest quality and health standards for our customers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-gold-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Family Values</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  As a family-run business, we treat every customer like family, providing personalized care and expert guidance for all plant needs.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-in-right">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Local Heritage</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  Proudly rooted in Kadiyam's rich horticultural tradition, we preserve and share the region's botanical expertise with India.
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
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 font-montserrat">
              Ready to Experience Our Legacy?
            </h2>
            <p className="text-lg sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto font-lora">
              Discover the difference that 30+ years of expertise and Kadiyam's fertile heritage can make in your garden
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
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
                <li><Link to="/catalog" className="hover:text-white transition-colors">Our Catalog</Link></li>
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
                <p>Email: contact@Nurseryshop.in</p>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-800 mt-8 pt-8 text-center text-emerald-200">
            <p className="text-sm sm:text-base font-lora">&copy; 2024 Nursery Shop. All rights reserved. | Kadiyam nursery, wholesale plants Andhra Pradesh, buy plants online India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
