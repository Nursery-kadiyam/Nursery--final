// Fixed navbar with proper spacing - Replace the navigation section in src/components/ui/navbar.tsx

        {/* Desktop Navigation */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center flex-1 justify-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === item.href ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
              >
                <div className="flex items-center">
                  {item.name}
                  {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                    <Badge className="bg-emerald-600 text-white text-xs px-2 py-1 ml-1">
                      {approvedQuotationsCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            {role === 'admin' && (
              <Link
                to="/admin-dashboard"
                className={`px-3 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
                onClick={() => console.log('Admin Dashboard link clicked!')}
              >
                Dashboard
              </Link>
            )}
            {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
              <Link
                to="/merchant-dashboard"
                className={`px-3 py-2 rounded-md font-montserrat text-base transition-all duration-200 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold" : "text-emerald-700 hover:text-gold-600"}`}
              >
                Merchant Dashboard
              </Link>
            )}
          </nav>
        )}