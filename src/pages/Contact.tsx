import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, MessageCircle, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Handle form submission here
  };

  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Get in Touch with Kadiyam Nursery
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto font-lora">
              We're here to help you with all your plant needs. Reach out to our expert team
              for personalized advice and assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
            <Card className="text-center p-4 sm:p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <Phone className="w-10 sm:w-12 h-10 sm:h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-bold text-emerald-800 mb-2 text-base sm:text-lg font-montserrat">Phone</h3>
              <p className="text-gray-600 text-sm sm:text-base font-lora">+91-92477-77927</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-lora">Mon-Sat, 9 AM - 6 PM</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <MessageCircle className="w-12 h-12 text-gold-600 mx-auto mb-4" />
              <h3 className="font-bold text-emerald-800 mb-2">WhatsApp</h3>
              <p className="text-gray-600">+91-92477-77927</p>
              <p className="text-sm text-gray-500 mt-1">Quick response</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-bold text-emerald-800 mb-2">Email</h3>
              <p className="text-gray-600">info@kadiyamnursery.com</p>
              <p className="text-sm text-gray-500 mt-1">24/7 support</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <MapPin className="w-12 h-12 text-gold-600 mx-auto mb-4" />
              <h3 className="font-bold text-emerald-800 mb-2">Visit Us</h3>
              <p className="text-gray-600 text-sm">Near Godavari Bridge, Kadiyam</p>
              <p className="text-sm text-gray-500 mt-1">Andhra Pradesh 533126</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form and Map */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* Contact Form */}
            <div className="animate-slide-in-left">
              <Card className="p-6 sm:p-8 border-0 shadow-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-6 font-montserrat">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                      Full Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-300 min-h-[48px]"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-300 min-h-[48px]"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-300 min-h-[48px]"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-300"
                      placeholder="Tell us about your plant requirements..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                    >
                      Send Message
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gold-600 text-gold-600 hover:bg-gold-600 hover:text-white transition-all duration-300 min-h-[48px] font-montserrat"
                      onClick={() => window.open('https://wa.me/919247777927', '_blank')}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Map and Additional Info */}
            <div className="animate-slide-in-right space-y-6">
              {/* Google Maps Embed */}
              <Card className="p-0 border-0 shadow-xl overflow-hidden">
                <div className="h-64 sm:h-80 bg-emerald-100 flex items-center justify-center">
                  <div className="text-center p-6 sm:p-8">
                    <MapPin className="w-12 sm:w-16 h-12 sm:h-16 text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-bold text-emerald-800 mb-2 font-montserrat">Visit Our Nursery</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base font-lora">
                      Kadiyam Nursery<br />
                      Near Godavari Bridge<br />
                      Kadiyam, Andhra Pradesh 533126
                    </p>
                    <Button
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white min-h-[44px] font-montserrat"
                      onClick={() => window.open('https://maps.google.com/?q=Kadiyam,Andhra+Pradesh', '_blank')}
                    >
                      Get Directions
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Our Team */}
              <Card className="p-6 border-0 shadow-xl">
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-emerald-600 mr-3" />
                  <h3 className="text-xl font-bold text-emerald-800">Our Expert Team</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Our experienced horticulturists and plant specialists are ready to help you
                  find the perfect plants for your garden, landscape, or indoor space.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                    Landscaping Advice
                  </span>
                  <span className="px-3 py-1 bg-gold-100 text-gold-700 text-sm rounded-full">
                    Plant Care Tips
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                    Custom Orders
                  </span>
                </div>
              </Card>
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

export default Contact;
