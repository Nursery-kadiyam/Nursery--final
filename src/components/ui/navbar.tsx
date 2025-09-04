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
    { name: "Our Catalog", href: "/catalog" },
    { name: "Shop", href: "/shop" },
    { name: "Contact", href: "/contact" },
    { name: "My Orders", href: "/orders" },
            { name: "Quotations", href: "/my-quotations" },
    // { name: "Register as Merchant", href: "/register-merchant" } // Remove this from navigation array
  ]

  useEffect(() => {
    // Fetch user role when user changes
    const fetchUserRole = async () => {
      if (user) {
        try {
          console.log('Navbar: Checking role for user:', user.email, 'ID:', user.id);
          
          // Try to find profile by email first (most reliable)
          let profile = null;
          const { data: profileByEmail, error: emailError } = await supabase
            .from('user_profiles')
            .select('role, user_id, id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (profileByEmail) {
            profile = profileByEmail;
            console.log('Navbar: Found profile by email:', profile);
          } else {
            // Try by user_id
            const { data: profileByUserId, error: userIdError } = await supabase
              .from('user_profiles')
              .select('role, user_id, id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (profileByUserId) {
              profile = profileByUserId;
              console.log('Navbar: Found profile by user_id:', profile);
            } else {
              // Try by id as fallback
              const { data: profileById, error: idError } = await supabase
                .from('user_profiles')
                .select('role, user_id, id')
                .eq('id', user.id)
                .maybeSingle();
              
              if (profileById) {
                profile = profileById;
                console.log('Navbar: Found profile by id:', profile);
              } else {
                console.log('Navbar: No profile found for user:', user.email);
                console.log('Navbar: Errors - Email:', emailError, 'UserID:', userIdError, 'ID:', idError);
              }
            }
          }
          
          // Debug: Log the exact profile role value
          console.log('Navbar: Profile role exact value:', JSON.stringify(profile?.role));
          console.log('Navbar: Profile role type:', typeof profile?.role);
          console.log('Navbar: Profile role length:', profile?.role?.length);
          
          if (profile && profile.role) {
            const roleLower = profile.role.toLowerCase().trim();
            console.log('Navbar: Role after lowercase and trim:', JSON.stringify(roleLower));
            
            if (roleLower === 'admin') {
              console.log('Navbar: Setting admin role for:', user.email, 'Profile role:', profile.role);
              setRole('admin');
            } else {
              console.log('Navbar: Setting regular role for:', user.email, 'Profile role:', profile.role);
              setRole(null);
            }
          } else {
            console.log('Navbar: No profile or role found for:', user.email);
            setRole(null);
          }
        } catch (error) {
          console.error('Navbar: Error fetching user role:', error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
    }

    fetchUserRole()

    // Fetch merchant status when user changes
    const fetchMerchantStatus = async () => {
      if (user && user.email) {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('status')
          .eq('email', user.email)
          .maybeSingle()
        setMerchantStatus(merchant?.status || null)
      } else {
        setMerchantStatus(null)
      }
    }
    fetchMerchantStatus()

    // Fetch approved quotations count
    const fetchApprovedQuotations = async () => {
      if (user) {
        const { data: quotations } = await supabase
          .from('quotations')
          .select('id, approved_price')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .not('approved_price', 'is', null); // Only count approved quotations with price
        setApprovedQuotationsCount(quotations?.length || 0)
      } else {
        setApprovedQuotationsCount(0)
      }
    }
    fetchApprovedQuotations()

    // Disabled real-time listener to prevent WebSocket errors
    // if (user) {
    //   const channel = supabase
    //     .channel('quotations_changes')
    //     .on(
    //       'postgres_changes',
    //       {
    //         event: '*',
    //         schema: 'public',
    //         table: 'quotations',
    //         filter: `user_id=eq.${user.id}`
    //       },
    //       () => {
    //         // Refresh approved quotations count when quotations change
    //         fetchApprovedQuotations()
    //       }
    //     )
    //     .subscribe()

    //   return () => {
    //     supabase.removeChannel(channel)
    //   }
    // }
  }, [user])

  // Refresh quotations count when navigating to quotations page
  useEffect(() => {
    if (location.pathname === '/my-quotations' && user) {
      const fetchApprovedQuotations = async () => {
        const { data: quotations } = await supabase
          .from('quotations')
          .select('id, approved_price')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .not('approved_price', 'is', null); // Only count approved quotations with price
        setApprovedQuotationsCount(quotations?.length || 0)
      }
      fetchApprovedQuotations()
    }
  }, [location.pathname, user])

  useEffect(() => {
    const updateCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      setCartCount(cart.length)
    }
    updateCart()
    window.addEventListener('cart-updated', updateCart)

    return () => {
      window.removeEventListener('cart-updated', updateCart)
    }
  }, [])

  const handleUserIconClick = () => {
    if (user) {
      setIsProfileOpen(true)
    } else {
      window.dispatchEvent(new CustomEvent('open-login-popup'))
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-50">
      <div className={`max-w-[1300px] mx-auto px-4 py-2 flex items-center ${logoLeft ? 'justify-start items-start' : 'justify-between'}`}>
        {/* Mobile Hamburger Menu - Left */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-emerald-800 hover:text-gold-600 hover:bg-emerald-50 transition-all duration-200"
            >
              <Menu className="h-7 w-6 mr-7" />
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
                  {/* <span className="text-orange-600">Kadiyam</span>{" "} */}
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
                      style={{ minHeight: 44 }}
                    >
                      <div className="flex items-center gap-2">
                        {item.name}
                        {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                          <Badge className="bg-emerald-600 text-white text-xs px-2 py-1">
                            {approvedQuotationsCount}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                  {role === 'admin' && (
                    <Link
                      to="/admin-dashboard"
                      onClick={() => {
                        console.log('Mobile Admin Dashboard link clicked!');
                        setIsOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-3 rounded-md font-montserrat text-lg transition-all duration-200 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold bg-gold-50 border-l-4 border-gold-600" : "text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"}`}
                      style={{ minHeight: 44 }}
                    >
                      Dashboard
                    </Link>
                  )}
                  {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
                    <Link
                      to="/merchant-dashboard"
                      onClick={() => setIsOpen(false)}
                      className={`block w-full text-left px-4 py-3 rounded-md font-montserrat text-lg transition-all duration-200 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold bg-gold-50 border-l-4 border-gold-600" : "text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"}`}
                      style={{ minHeight: 44 }}
                    >
                      Merchant Dashboard
                    </Link>
                  )}
                </div>
              )}
              <div className="py-4 border-t border-emerald-100 px-4">
                {!hideCart && (
                  <Link to="/cart" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gold-600 hover:bg-gold-700 text-white font-montserrat transition-all duration-200 relative min-h-[44px] flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Cart {cartCount > 0 && `(${cartCount})`}
                      {cartCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs p-0">
                          {cartCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
                <div className="flex gap-2 mt-3">
                  {!hideWishlist && (
                    <Link to="/wishlist" onClick={() => setIsOpen(false)} className="flex-1">
                      <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-montserrat flex items-center justify-center">
                        <Heart className="w-4 h-4 mr-2" />
                        Wishlist
                      </Button>
                    </Link>
                  )}
                  {!hideLogin && (
                    <Button
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-montserrat flex items-center justify-center"
                      onClick={handleUserIconClick}
                    >
                      <User className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex flex-col items-start min-w-[70px] mr-5">
          <span className="text-2xl font-bold font-montserrat leading-tight mr-5">
            <span className="text-emerald-800">Nursery</span>
          </span>
          <span className="text-base text-gold-600 font-lora italic border-b border-gold-600/30 hover:border-gold-600 transition-all duration-300 leading-snug">
            Kadiyam
          </span>
        </Link>

        {/* Desktop Navigation */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center flex-1 justify-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === item.href ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
              >
                <div className="flex items-center gap-2">
                  {item.name}
                  {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                    <Badge className="bg-emerald-600 text-white text-xs px-2 py-1">
                      {approvedQuotationsCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            {role === 'admin' && (
              <Link
                to="/admin-dashboard"
                className={`px-4 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
                onClick={() => console.log('Admin Dashboard link clicked!')}
              >
                Dashboard
              </Link>
            )}
            {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
              <Link
                to="/merchant-dashboard"
                className={`px-4 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
              >
                Merchant Dashboard
              </Link>
            )}
          </nav>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
          {/* Wishlist (Heart) Icon */}
          {!hideWishlist && (
            <Link to="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-700 hover:text-gold-600 hover:bg-gold-50 transition-all duration-200 ml-6"
              >
                <Heart className="w-5 h-5 ml-6" />
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
          {/* Desktop Cart Button */}
          {!hideCart && (
            <Link to="/cart">
              <Button className="relative bg-gold-600 hover:bg-gold-700 text-white px-2 font-semibold transition-all duration-200 shadow-sm min-h-[40px] font-montserrat flex items-center mt-1">
                <ShoppingCart className="w-2 h-3 mr-2" />
                Cart
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs p-0 border-2 border-white">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
          )}
        </div>
      </div>
      <MyProfilePopup isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  )
}

export { Navbar }
