// Updated Catalog.tsx with Request Plant Quotation heading
// This shows the updated main heading

            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-4">
                🌱 Request Plant Quotation
              </h2>
              <p className="text-gray-600 mb-6">
                Submit comprehensive quotations for multiple plants with detailed specifications
              </p>
              <Button
                onClick={() => setShowPlantForm(!showPlantForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {showPlantForm ? "Hide Form" : "Show Plant Selection Form"}
              </Button>
            </div>