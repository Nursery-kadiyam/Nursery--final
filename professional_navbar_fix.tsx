        {/* Desktop Navigation - PROFESSIONAL FIX */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center flex-1 justify-center">
            <div className="flex items-center">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 mx-1 rounded-md font-montserrat text-base transition-all duration-200 hover:bg-emerald-50 ${location.pathname === item.href ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
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
                  className={`px-3 py-2 mx-1 rounded-md font-montserrat text-base transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  onClick={() => console.log('Admin Dashboard link clicked!')}
                >
                  Dashboard
                </Link>
              )}
              {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
                <Link
                  to="/merchant-dashboard"
                  className={`px-3 py-2 mx-1 rounded-md font-montserrat text-base transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                >
                  Merchant Dashboard
                </Link>
              )}
            </div>
          </nav>
        )}