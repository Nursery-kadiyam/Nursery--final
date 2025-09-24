// Updated Index.tsx with Request Quotation button
// This shows the updated hero section with the new button

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
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg min-h-[48px] font-montserrat"
                >
                  Request Quotation
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
                // ... rest of the dialog content remains the same
              </Dialog>
            </div>