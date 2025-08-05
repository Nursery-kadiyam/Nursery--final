import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems: Array<{
    to?: string;
    label: string;
    icon: (active: boolean) => JSX.Element;
    badge?: number;
    action?: () => void;
}> = [
        {
            to: "/",
            label: "Home",
            icon: (active: boolean) => (
                <svg width="32" height="32" viewBox="0 0 24 24" fill={active ? "#eab308" : "none"} stroke={active ? "#eab308" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11L12 4l9 7" />
                    <path d="M4 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4h4v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10" />
                </svg>
            ),
        },
        {
            to: "/shop",
            label: "Shop",
            icon: (active: boolean) => (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={active ? "#eab308" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2l1.5 4h9L18 2" />
                    <rect x="3" y="6" width="18" height="14" rx="2" />
                    <path d="M16 10a4 4 0 01-8 0" />
                </svg>
            ),
        },
        {
            to: "/catalog",
            label: "Categories",
            icon: (active: boolean) => (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={active ? "#eab308" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="2" />
                    <rect x="14" y="3" width="7" height="7" rx="2" />
                    <rect x="14" y="14" width="7" height="7" rx="2" />
                    <rect x="3" y="14" width="7" height="7" rx="2" />
                </svg>
            ),
        },
        {
            to: "/orders",
            label: "Account",
            icon: (active: boolean) => (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={active ? "#eab308" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 8-6 8-6s8 2 8 6" />
                </svg>
            ),
        },
        {
            to: "/cart",
            label: "Cart",
            icon: (active: boolean) => (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={active ? "#eab308" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
            badge: 7,
        },
    ];

const BottomNav = () => {
    const location = useLocation();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const updateCartCount = () => {
            try {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                setCartCount(cart.length);
            } catch {
                setCartCount(0);
            }
        };
        updateCartCount();
        window.addEventListener('cart-updated', updateCartCount);
        window.addEventListener('storage', updateCartCount);
        return () => {
            window.removeEventListener('cart-updated', updateCartCount);
            window.removeEventListener('storage', updateCartCount);
        };
    }, []);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex justify-around items-center h-16 md:hidden shadow">
            {navItems.map((item) => {
                if (item.label === "Cart") {
                    const isActive = location.pathname === item.to;
                    return (
                        <Link
                            key={item.label}
                            to={item.to!}
                            className={`flex flex-col items-center text-xs font-medium transition-all duration-200 px-2 py-1 rounded-md min-w-[60px] min-h-[44px] ${isActive ? "text-gold-600 font-semibold bg-gold-50 border-l-4 border-gold-600" : "text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"}`}
                        >
                            <div className="relative">
                                {item.icon(isActive)}
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full text-xs px-1">
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            <span className={isActive ? "font-bold text-gold-600" : ""}>{item.label}</span>
                        </Link>
                    );
                }
                if (item.action) {
                    return (
                        <button
                            key={item.label}
                            onClick={item.action}
                            className="flex flex-col items-center text-xs font-medium transition-all duration-200 px-2 py-1 rounded-md min-w-[60px] min-h-[44px] text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"
                        >
                            <div className="relative">
                                {item.icon(false)}
                            </div>
                            <span>{item.label}</span>
                        </button>
                    );
                }
                const isActive = location.pathname === item.to;
                return (
                    <Link
                        key={item.label}
                        to={item.to!}
                        className={`flex flex-col items-center text-xs font-medium transition-all duration-200 px-2 py-1 rounded-md min-w-[60px] min-h-[44px] ${isActive ? "text-gold-600 font-semibold bg-gold-50 border-l-4 border-gold-600" : "text-emerald-700 hover:text-gold-600 hover:bg-emerald-50"}`}
                    >
                        <div className="relative">
                            {item.icon(isActive)}
                        </div>
                        <span className={isActive ? "font-bold text-gold-600" : ""}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

export default BottomNav;

// Replace with your own SVG or icon components
function HomeIcon() { return <svg width="24" height="24">{/* ... */}</svg>; }
function PlayIcon() { return <svg width="24" height="24">{/* ... */}</svg>; }
function CategoriesIcon() { return <svg width="24" height="24">{/* ... */}</svg>; }
function AccountIcon() { return <svg width="24" height="24">{/* ... */}</svg>; }
function CartIcon() { return <svg width="24" height="24">{/* ... */}</svg>; }
