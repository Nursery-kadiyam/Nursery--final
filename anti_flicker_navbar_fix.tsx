        {/* Desktop Navigation - ANTI-FLICKER FIX */}
        {!hideNavigationLinks && (
          <nav className="hidden md:flex items-center flex-1 justify-center">
            <div className="flex items-center" style={{ gap: '4px' }}>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === item.href ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <div className="flex items-center">
                    <span className="truncate">{item.name}</span>
                    {item.name === "Quotations" && approvedQuotationsCount > 0 && (
                      <Badge className="bg-emerald-600 text-white text-xs px-1 py-0.5 ml-1 rounded-full">
                        {approvedQuotationsCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              {role === 'admin' && (
                <Link
                  to="/admin-dashboard"
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/admin-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onClick={() => console.log('Admin Dashboard link clicked!')}
                >
                  <span className="truncate">Dashboard</span>
                </Link>
              )}
              {(merchantStatus === 'approved' || merchantStatus === 'blocked') && (
                <Link
                  to="/merchant-dashboard"
                  className={`px-1 py-2 whitespace-nowrap rounded-md font-montserrat text-xs transition-all duration-200 hover:bg-emerald-50 ${location.pathname === "/merchant-dashboard" ? "text-gold-600 font-semibold bg-gold-50" : "text-emerald-700 hover:text-gold-600"}`}
                  style={{ 
                    minWidth: 'fit-content',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span className="truncate">Merchant Dashboard</span>
                </Link>
              )}
            </div>
          </nav>
        )}