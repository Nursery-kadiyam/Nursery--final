import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Header */}
      <header className="bg-emerald-900 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-center font-montserrat">
            Privacy Policy
          </h1>
          <p className="text-emerald-200 text-center mt-2 font-lora">
            How we protect and handle your information
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="prose prose-lg max-w-none">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-emerald-900 mb-4 font-montserrat">
                Privacy Policy for Nursery Shop
              </h2>
              <p className="text-gray-600 mb-4">
                <strong>Effective Date:</strong> January 1, 2024
              </p>
              <p className="text-gray-700 leading-relaxed">
                NURSERY SHOP ("we," "our," "us") respects your privacy and is committed to protecting your personal data. 
                This Privacy Policy explains how we collect, use, store, and share information when you use our website and services.
              </p>
            </div>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                1. Information We Collect
              </h3>
              <p className="text-gray-700 mb-4">
                We may collect the following information when you use our app:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Google Account Information (via Google Sign-In):</strong> Name, email address, and profile picture.
                </li>
                <li>
                  <strong>User-provided Information:</strong> Details you provide such as child's name, age, enrollment information, or contact details.
                </li>
                <li>
                  <strong>Usage Data:</strong> Log data, device information, and how you interact with our website.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                2. How We Use Information
              </h3>
              <p className="text-gray-700 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide and improve our nursery management services.</li>
                <li>Authenticate and securely log you into our app using Google Sign-In.</li>
                <li>Communicate with you regarding updates, notifications, or support.</li>
                <li>Maintain security and prevent unauthorized access.</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We do not sell or share your Google account data with third parties for advertising or marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                3. Google User Data
              </h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Our app complies with Google API Services User Data Policy, including the Limited Use requirements.</li>
                <li>We only access your basic profile information (name, email, profile picture) to identify and authenticate you.</li>
                <li>We do not use your Google data for purposes other than providing our nursery services.</li>
                <li>We do not transfer your Google data to third parties except as required by law.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                4. Sharing of Information
              </h3>
              <p className="text-gray-700 mb-4">
                We may share your information only in these cases:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>With service providers who help us operate the app (e.g., hosting services like Supabase/Vercel).</li>
                <li>To comply with legal obligations.</li>
                <li>To protect the rights, safety, or security of our users and services.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                5. Data Storage and Security
              </h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your data is securely stored on Supabase/Vercel servers.</li>
                <li>We use industry-standard measures to protect your personal data from unauthorized access or disclosure.</li>
                <li>We retain your data only as long as necessary to provide our services.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                6. Your Rights
              </h3>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction or deletion of your data.</li>
                <li>Revoke Google Sign-In access at any time via your Google Account settings.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                7. In-Product Privacy Notifications
              </h3>
              <p className="text-gray-700">
                We will clearly display in-app privacy notices to explain how we use your data whenever you sign in with Google or provide additional personal information.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                8. Updates to This Privacy Policy
              </h3>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Effective Date."
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4 font-montserrat">
                9. Contact Us
              </h3>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or your data, please contact us:
              </p>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  📧 Email: contact@nurseryshop.in<br />
                  🌐 Website: www.nurseryshop.in<br />
                  📍 Address: Kadiyam Nursery, Near Godavari Bridge, Kadiyam, Andhra Pradesh 533126<br />
                  📞 Phone: +91-9247777927
                </p>
              </div>
            </section>
          </div>

          {/* Back to Home Button */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-4 font-montserrat">Nursery Shop</h3>
              <p className="text-emerald-200 mb-4 font-lora">
                Premium plants from Kadiyam, Andhra Pradesh, delivered across India.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Quick Links</h4>
              <ul className="space-y-2 text-emerald-200">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Our Plants</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Shop</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Plant Categories</h4>
              <ul className="space-y-2 text-emerald-200">
                <li><Link to="/plants" className="hover:text-white transition-colors">Ornamental Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Flowering Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Fruit Plants</Link></li>
                <li><Link to="/plants" className="hover:text-white transition-colors">Medicinal Plants</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 font-montserrat">Contact Info</h4>
              <div className="text-emerald-200 space-y-2 text-sm sm:text-base">
                <p>Kadiyam Nursery, Near Godavari Bridge</p>
                <p>Kadiyam, Andhra Pradesh 533126</p>
                <p>Phone: +91-9247777927</p>
                <p>WhatsApp: +91-9247777927</p>
                <p>Email: contact@nurseryshop.in</p>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-800 mt-8 pt-8 text-center text-emerald-200">
            <p className="text-sm sm:text-base font-lora">
              &copy; 2024 Nursery Shop. All rights reserved. | Kadiyam nursery, wholesale plants Andhra Pradesh, buy plants online India
            </p>
            <div className="mt-4 flex justify-center space-x-4 text-sm">
              <Link to="/privacy-policy" className="text-emerald-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-emerald-600">|</span>
              <Link to="/terms-of-service" className="text-emerald-300 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
