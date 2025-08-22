import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import About from "./pages/About";
import OurPlants from "./pages/OurPlants";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import Catalog from "./pages/Catalog";
import Wishlist from "./pages/Wishlist";
import ProductDetails from "./pages/ProductDetails";
import NotFound from "./pages/NotFound";
import { LoginPopup } from "./components/ui/login-popup";
import BottomNav from "./components/ui/BottomNavbar";
import Orders from "./pages/Orders";
import OrderSummaryPage from "./pages/OrderSummaryPage";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import RegisterMerchant from "./pages/RegisterMerchant";
import AdminDashboard from "./pages/AdminDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import MyQuotations from "./pages/MyQuotations";
import AdminAutoRedirect from "./components/AdminAutoRedirect";
import AuthCallback from "./pages/AuthCallback";
import AdminTest from "./components/AdminTest";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => {
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  useEffect(() => {
    const handleLoginPopup = () => {
      setIsLoginPopupOpen(true);
    };

    window.addEventListener('open-login-popup', handleLoginPopup);

    return () => {
      window.removeEventListener('open-login-popup', handleLoginPopup);
    };
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AdminAutoRedirect />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/plants" element={<OurPlants />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/my-quotations" element={<MyQuotations />} />
                <Route path="/order-summary" element={<OrderSummaryPage />} />
                <Route path="/register-merchant" element={<RegisterMerchant />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/merchant-dashboard" element={<MerchantDashboard />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                                 <Route path="/auth/callback" element={<AuthCallback />} />
                 <Route path="/test-admin" element={<AdminTest />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </BrowserRouter>
            <LoginPopup isOpen={isLoginPopupOpen} onClose={() => setIsLoginPopupOpen(false)} />
          </TooltipProvider>
        </QueryClientProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
