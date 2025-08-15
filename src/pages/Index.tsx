import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "../lib/supabase";


// Add as many images as you want for a richer hero effect
const heroImages = [
  "/assets/kobbari.jpeg",
  "/assets/akalifa pink.jpeg",
  "/assets/Croton plant.jpeg",
  "/assets/Micro multi balls.jpeg",
  "/assets/pendanus.jpeg"
];

// Animation speed in milliseconds (change this for faster/slower transitions)
const HERO_ANIMATION_INTERVAL = 4000; // 4 seconds

// Component to render an image and hide it if it fails to load
const HeroImage = ({ src, className }) => {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      draggable="false"
      style={{ userSelect: 'none' }}
      onError={() => setError(true)}
    />
  );
};

const Index = () => {
  // Remove current image state, we don't need it anymore
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    nurseryName: '',
    phoneNumber: '',
    email: '',
    nurseryAddress: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegisterMerchant = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);
    
    // Generate merchant code
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .ilike('merchant_code', `MC-${year}-%`);
    const nextNumber = (count || 0) + 1;
    const merchantCode = `MC-${year}-${String(nextNumber).padStart(4, '0')}`;
    
    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          nursery_name: form.nurseryName,
          phone_number: form.phoneNumber,
        }
      }
    });
    if (authError) {
      setFormError(authError.message);
      setFormLoading(false);
      return;
    }
    // 2. Insert into merchants table
    const { error: dbError } = await supabase.from('merchants').insert([
      {
        full_name: form.fullName,
        nursery_name: form.nurseryName,
        phone_number: form.phoneNumber,
        email: form.email,
        nursery_address: form.nurseryAddress,
        merchant_code: merchantCode,
        status: 'pending',
      }
    ]);
    if (dbError) {
      setFormError(dbError.message);
      setFormLoading(false);
      return;
    }
    setFormSuccess('Registration successful! Your account is pending approval.');
    setFormLoading(false);
    setForm({ fullName: '', nurseryName: '', phoneNumber: '', email: '', nurseryAddress: '', password: '' });
  };

  // CSS for infinite scroll animation
  const scrollAnimation = `
    @keyframes hero-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `;

  return (
    <div className="min-h-screen bg-white font-montserrat">
      <style>{scrollAnimation}</style>
      {/* Header */}
      <Navbar />


      {/* Hero Section */}
      <section
        id="home"
        className="relative min-h-[60vh] flex flex-col md:flex-row items-center overflow-hidden bg-gradient-to-r from-emerald-50 to-white"
      >
        {/* Left: Text Content */}
        <div className="container mx-auto px-4 relative z-30 flex-1 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto text-center md:text-left text-white animate-fade-in">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight font-montserrat text-emerald-900">
              Best Quality Plants at{" "}
              <span className="text-gold-400">Wholesale Prices</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-4 text-emerald-700 font-medium font-lora">
              From the Heart of Kadiyam Nurseries
            </p>
            <p className="text-base sm:text-lg md:text-xl mb-8 text-gray-700 max-w-3xl mx-auto md:mx-0 font-lora">
              Discover ornamental, flowering, fruit, medicinal, and exotic plants — delivered across India
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
              <Link to="/shop">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
                >
                  Order in Bulk
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white text-emerald-800 bg-transparent hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
                  >
                    Register as Merchant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Register as Merchant</DialogTitle>
                  <DialogDescription>
                    Please fill the form below to register your nursery with us. Your request will be reviewed by our admin team before activation.
                  </DialogDescription>
                  <form onSubmit={handleRegisterMerchant} className="space-y-4 mt-4">
                    <Input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleFormChange} required />
                    <Input name="nurseryName" placeholder="Nursery Name" value={form.nurseryName} onChange={handleFormChange} required />
                    <Input name="phoneNumber" placeholder="Phone Number" value={form.phoneNumber} onChange={handleFormChange} required />
                    <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleFormChange} required />
                    <Textarea name="nurseryAddress" placeholder="Nursery Address" value={form.nurseryAddress} onChange={handleFormChange} required />
                    <Input name="password" type="password" placeholder="Password" value={form.password} onChange={handleFormChange} required minLength={6} />
                    {formError && <div className="text-red-600 text-sm">{formError}</div>}
                    {formSuccess && <div className="text-green-600 text-sm">{formSuccess}</div>}
                    <Button type="submit" className="w-full" disabled={formLoading}>{formLoading ? 'Registering...' : 'Submit'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        {/* Right: Animated Images Row */}
        <div className="w-full md:w-[520px] flex-shrink-0 flex flex-col items-center justify-center relative z-20 mt-8 md:mt-0">
          <div className="overflow-hidden w-full h-64 relative">
            <div
              className="flex gap-0 items-center animate-marquee"
              style={{
                width: `calc(${heroImages.length * 2} * 16rem)`
              }}
            >
              {[...heroImages, ...heroImages].map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="h-64 w-64 object-cover rounded-xl shadow-lg border-4 border-white bg-white"
                  draggable="false"
                  style={{ userSelect: 'none' }}
                  loading="eager"
                  decoding="async"
                />
              ))}
            </div>
          </div>
          <style>
            {`
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${heroImages.length * 16}rem); }
              }
              .animate-marquee {
                animation: marquee 60s linear infinite;
              }
            `}
          </style>
        </div>
      </section>

      {/* Plant Categories Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Our Plant Categories
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-lora">
              Carefully curated selection from the heart of Kadiyam, Andhra Pradesh
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            {[
              { name: "Ornamental Plants", image: "photo-1509316975850-ff9c5deb0cd9", color: "emerald" },
              { name: "Flowering Plants", image: "photo-1465146344425-f00d5f5c8f07", color: "gold" },
              { name: "Fruit Plants", image: "photo-1513836279014-a89f7a76ae86", color: "emerald" },
              { name: "Medicinal Plants", image: "photo-1518495973542-4542c06a5843", color: "gold" },
              { name: "Exotic Plants", image: "photo-1469474968028-56623f02e42e", color: "emerald" }
            ].map((category, index) => (
              <Link key={index} to="/plants">
                <Card className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden">
                  <div className="relative h-40 sm:h-48 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundImage: `url('https://images.unsplash.com/${category.image}?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80')`
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-white text-base sm:text-lg font-bold text-center px-4 font-montserrat">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-800 mb-6 font-montserrat">
              Why Choose Nursery Shop?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-lora">
              Your trusted partner for premium plants from the renowned Kadiyam nurseries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-in-left">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-600 font-montserrat">1000+</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Plant Varieties</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  From ornamental to exotic species, discover our extensive collection of healthy, premium plants
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl sm:text-2xl font-bold text-gold-600">🇮🇳</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Pan-India Delivery</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  Safe and secure delivery across all states with proper packaging and care instructions
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-in-right">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-600">💰</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-4 font-montserrat">Wholesale & Retail</h3>
                <p className="text-gray-600 leading-relaxed font-lora">
                  Competitive prices for both bulk orders and individual purchases with special discounts
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
              Ready to Transform Your Garden?
            </h2>
            <p className="text-lg sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto font-lora">
              Join thousands of satisfied customers who trust Nursery Shop for their plant needs
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/contact">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-gray-100 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Us
                </Button>
              </Link>
              <Link to="/plants">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-emerald-800 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                >
                  View Our Collection
                  <ArrowRight className="w-5 h-5 ml-2" />
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
            <p className="text-sm sm:text-base font-lora">&copy; 2024 Nursery Shop. All rights reserved. | Kadiyam nursery, wholesale plants Andhra Pradesh, buy plants online India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
