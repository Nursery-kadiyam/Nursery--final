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
  
  // Debug: Log role changes and provide fallback
  useEffect(() => {
    console.log('Navbar: Role state changed to:', role);
    
    // Fallback: If user is logged in but role is null, check if it's the admin email
    if (!role && user && user.email === 'pullajiabbireddy143@gmail.com') {
      console.log('Navbar: Fallback - Setting admin role for known admin email');
      setRole('admin');
    }
  }, [role, user]);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Categories", href: "/plants" },
    { name: "Request Quotation", href: "/catalog" },
    { name: "Shop", href: "/shop" },
    { name: "Contact", href: "/contact" },
    { name: "My Orders", href: "/orders" },
    { name: "Quotations", href: "/my-quotations" },
    // { name: "Register as Merchant", href: "/register-merchant" } // Remove this from navigation array
  ]

  // ... rest of the file remains the same