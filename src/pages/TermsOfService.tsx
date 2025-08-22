import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Header */}
      <header className="bg-emerald-900 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-center font-montserrat">
            Terms of Service
          </h1>
          <p className="text-emerald-200 text-center mt-2 font-lora">
            Terms and conditions for using our services
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-emerald-800 mb-6">Terms of Service for Nursery Shop</h2>
            
            <p className="text-gray-600 mb-4">
              <strong>Effective Date:</strong> January 1, 2024
            </p>

            <p className="mb-6">
              Welcome to <strong>Nursery Shop</strong> ("we," "our," "us"). These Terms of Service ("Terms") govern your use of our website and services ("Services"). By accessing or using our Services, you agree to be bound by these Terms.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">1. Eligibility</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You must be at least 18 years old to use our Services.</li>
                  <li>If you are using our Services on behalf of a child (e.g., as a parent or guardian), you are responsible for the accuracy of the information you provide.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">2. Use of Services</h3>
                <p className="mb-3 text-gray-700">You agree to use our Services only for lawful purposes. You may not:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Use the Services in any way that violates applicable laws.</li>
                  <li>Attempt to gain unauthorized access to our systems or data.</li>
                  <li>Share false or misleading information.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">3. Accounts and Security</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You may sign in using Google Sign-In. You are responsible for maintaining the confidentiality of your login credentials.</li>
                  <li>You agree to notify us immediately if you suspect unauthorized use of your account.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">4. User Content</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You may submit information such as child details, enrollment requests, or messages.</li>
                  <li>You retain ownership of the content you provide but grant us a limited license to use it solely for providing our Services.</li>
                  <li>You must not upload harmful, offensive, or unlawful content.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">5. Privacy</h3>
                <p className="text-gray-700">
                  Your use of our Services is also governed by our{' '}
                  <Link to="/privacy-policy" className="text-emerald-600 hover:text-emerald-800 underline">
                    Privacy Policy
                  </Link>
                  . Please review it to understand how we collect and use your data.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">6. Third-Party Services</h3>
                <p className="text-gray-700">
                  Our Services may integrate with third-party services such as Google Sign-In. We are not responsible for the content, policies, or practices of those third-party providers.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">7. Service Availability</h3>
                <p className="text-gray-700">
                  We aim to provide continuous access to our Services, but we cannot guarantee uninterrupted availability. We may suspend or modify Services at any time.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">8. Limitation of Liability</h3>
                <p className="text-gray-700">
                  To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages resulting from your use of the Services.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">9. Termination</h3>
                <p className="text-gray-700">
                  We may suspend or terminate your account if you violate these Terms or misuse our Services.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">10. Changes to Terms</h3>
                <p className="text-gray-700">
                  We may update these Terms from time to time. Continued use of our Services after updates constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">11. Governing Law</h3>
                <p className="text-gray-700">
                  These Terms shall be governed by the laws of India, without regard to conflict of law principles.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-emerald-700 mb-3">12. Contact Us</h3>
                <p className="text-gray-700 mb-2">If you have any questions about these Terms, contact us at:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">📧 Email: contact@nurseryshop.in</p>
                  <p className="text-gray-700">🌐 Website: www.nurseryshop.in</p>
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

export default TermsOfService;
