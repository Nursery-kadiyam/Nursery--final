// Complete Professional Navbar Fix
// Replace the entire navbar component with this fixed version

import * as React from "react"
import { Menu, X, ShoppingCart, User, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Link, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import MyProfilePopup from "./my-profile-popup"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import RegisterMerchant from "@/pages/RegisterMerchant";

interface NavbarProps {
  hideNavigationLinks?: boolean;
  hideCart?: boolean;
  hideWishlist?: boolean;
  hideLogin?: boolean;
  logoLeft?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ hideNavigationLinks = false, hideCart = false, hideWishlist = false, hideLogin = false, logoLeft = false }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [cartCount, setCartCount] = React.useState(0)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [approvedQuotationsCount, setApprovedQuotationsCount] = useState(0);
  const location = useLocation()
  const { user } = useAuth()

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Categories", href: "/plants" },
    { name: "Request Quotation", href: "/catalog" },
    { name: "Shop", href: "/shop" },
    { name: "Contact", href: "/contact" },
    { name: "My Orders", href: "/orders" },
    { name: "Quotations", href: "/my-quotations" },
  ]

  // ... existing useEffect hooks remain the same ...

  const handleUserIconClick = () => {
    if (user) {
      setIsProfileOpen(true)
    } else {
      window.dispatchEvent(new CustomEvent('open-login-popup'))
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-50">
      <div className="max-w-[1300px] mx-auto px-4 py-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Mobile Hamburger Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-emerald-800 hover:text-gold-600 hover:bg-emerald-50 transition-all duration-200"
            >
              <Menu className="h-7 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[300px] bg-white border-r border-emerald-100 animate-slide-in-left p-0"
          >
            <div className="flex flex-col">
              <div className="text-center py-6 border-b border-emerald-100">
                <h2 className="text-2xl font-bold font-montserrat leading-tight">
                  <span className="text-emerald-800">Nursery</span>
                </h2>
                <p className="text-base text-gold-600 mt-1 font-lora italic">Kadiyam</p>
              </div>
              {!hideNavigationLinks && (
                <div className="flex-1 flex flex-col gap-2 py-4 px-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block w-full text-left px-4 py-3 rounded-md font-montserrat text-lg transition-all duration-200 ${location.pathname === item.href ? "text-gold-600 font-semibold bg-gold-50 border-l-4 border-gold-600" : "text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"}`}
                    >
                      <div className="flex items-center">
                        {item.name}
                        {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                          <Badge className="bg-emerald-600 text-white text-xs px-2 py-1 ml-2">
                            {approvedQuotationsCount}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex flex-col items-start min-w-[70px]">
          <span className="text-2xl font-bold font-montserrat leading-tight">
            <span className="text-emerald-800">Nursery</span>
          </span>
          <span className="text-base text-gold-600 font-lora italic border-b border-gold-600/30 hover:border-gold-600 transition-all duration-300 leading-snug">
            Kadiyam
          </span>
        </Link>

        {/* Desktop Navigation */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center" style={{ gap: '20px' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 whitespace-nowrap rounded-md font-montserrat text-sm transition-all duration-200 hover:bg-emerald-50 ${location.pathname === item.href ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
              >
                <div className="flex items-center">
                  {item.name}
                  {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                    <Badge className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 ml-1 rounded-full">
                      {approvedQuotationsCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            {role === 'admin' && (
              <Link
                to="/admin-dashboard"
                className={`px-3 py-2 whitespace-nowrap rounded-md font-montserrat text-sm transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                onClick={() => console.log('Admin Dashboard link clicked!')}
              >
                Dashboard
              </Link>
            )}
            {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
              <Link
                to="/merchant-dashboard"
                className={`px-3 py-2 whitespace-nowrap rounded-md font-montserrat text-sm transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
              >
                Merchant Dashboard
              </Link>
            )}
          </nav>
        )}

        {/* Right side actions */}
        <div className="flex items-center" style={{ gap: '12px' }}>
          {/* Wishlist (Heart) Icon */}
          {!hideWishlist && (
            <Link to="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-700 hover:text-gold-600 hover:bg-gold-50 transition-all duration-200"
              >
                <Heart className="w-5 h-5" />
                <span className="sr-only">Wishlist</span>
              </Button>
            </Link>
          )}
          
          {/* User Profile Icon */}
          {!hideLogin && (
            <Button
              variant="ghost"
              size="icon"
              className="text-emerald-700 hover:text-gold-600 hover:bg-gold-50 transition-all duration-200"
              onClick={handleUserIconClick}
            >
              <User className="w-5 h-5" />
              <span className="sr-only">User Profile</span>
            </Button>
          )}

          {/* Cart Button */}
          {!hideCart && (
            <Link to="/cart">
              <Button className="bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-md font-montserrat transition-all duration-200 flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart
                {cartCount > 0 && (
                  <Badge className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 ml-2 rounded-full">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Profile Popup */}
      {isProfileOpen && (
        <MyProfilePopup
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Register Merchant Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent>
          <RegisterMerchant onClose={() => setIsRegisterDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  )
}

export default Navbar