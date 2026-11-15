import { useState, useEffect } from 'react';
import { Instagram, Facebook, MapPin, Phone, Mail, Clock, X, Shield, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const TikTokIcon = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    if (!legalModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLegalModal(null);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [legalModal]);

  return (
    <>
      <footer className="bg-[#060606] border-t border-orange-500/20 pt-20 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Crrave Leyton" className="h-14 w-14 rounded-full object-cover border border-orange-500/50 shadow-md shadow-orange-500/20" />
                <h3 className="text-2xl font-bold tracking-tighter text-orange-500">CRRAVE LEYTON</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Experience the mouthwatering taste of Crrave Leyton. Sizzling smash burgers, flame-grilled peri chicken, loaded fries, and gourmet milkshakes crafted for collection and fast delivery.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://www.instagram.com/crrave.leyton/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-orange-500 text-white transition-all"
                  title="Follow us on Instagram"
                >
                  <Instagram size={18} />
                </a>
                <a 
                  href="https://www.facebook.com/people/Crrave/61573871107631/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-orange-500 text-white transition-all"
                  title="Follow us on Facebook"
                >
                  <Facebook size={18} />
                </a>
                <a 
                  href="https://www.tiktok.com/@crrave.leyton" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 rounded-full hover:bg-orange-500 text-white transition-all"
                  title="Follow us on TikTok"
                >
                  <TikTokIcon size={18} />
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-orange-500">Contact Us</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-gray-200">
                  <MapPin size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>323A Lea Bridge Road, E10 7LA</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <Phone size={18} className="text-orange-500 flex-shrink-0" />
                  <span>
                    <a href="tel:07947465085" className="hover:text-orange-500 transition-colors">07947465085</a> /{" "}
                    <a href="tel:01708361952" className="hover:text-orange-500 transition-colors">01708361952</a>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <Mail size={18} className="text-orange-500 flex-shrink-0" />
                  <span>
                    <a href="mailto:crraveleyton@gmail.com" className="hover:text-orange-500 transition-colors">
                      crraveleyton@gmail.com
                    </a>
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-orange-500">Opening Hours</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-gray-200">
                  <Clock size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Mon - Sun</p>
                    <p className="text-gray-300">12:00pm - 12:00am (12:00 - 00:00)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-400 uppercase tracking-widest font-bold">
            <p className="text-center md:text-left">© 2026 BIZNEXT TECHNOLOGY LTD. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="hover:text-white transition-colors uppercase tracking-widest font-bold cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="hover:text-white transition-colors uppercase tracking-widest font-bold cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {legalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="legal-modal-title"
              className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#141414]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-500">
                    {legalModal === 'privacy' ? <Shield size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h2 id="legal-modal-title" className="text-lg font-bold text-white tracking-tight">
                      {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      Crrave Leyton &bull; Platform by Biznext Technology Ltd
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Switch Tabs */}
              <div className="flex gap-2 px-6 pt-4 pb-2 border-b border-white/5 bg-[#111]">
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    legalModal === 'privacy'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    legalModal === 'terms'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Terms of Service
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-300 leading-relaxed">
                {legalModal === 'privacy' ? (
                  <>
                    <p className="text-xs text-gray-400">Effective Date: 1 January 2026</p>
                    <p>
                      This Privacy Policy explains how <strong className="text-white">Crrave Leyton</strong> (located at 323A Lea Bridge Road, London, E10 7LA) and our technology partner and platform developer <strong className="text-white">Biznext Technology Ltd</strong> collect, use, and safeguard your personal information when you browse or place an order through this web application.
                    </p>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">1. Information We Collect</h3>
                      <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
                        <li><strong className="text-white">Contact & Account Details:</strong> Name, email address, and phone number provided when creating an account or placing a guest order.</li>
                        <li><strong className="text-white">Order & Delivery Information:</strong> Delivery address, postcode, selected food items, dietary notes, and preferred collection or delivery time slots.</li>
                        <li><strong className="text-white">Loyalty Stampcard Data:</strong> Order count and reward eligibility if you sign in to collect loyalty stamps.</li>
                        <li><strong className="text-white">Technical Information:</strong> Essential session data and browser storage required to keep your shopping cart and checkout state working smoothly.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">2. How We Use Your Information</h3>
                      <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
                        <li>To prepare, fulfil, and deliver your food orders accurately and on time.</li>
                        <li>To contact you regarding order confirmations, delays, or delivery arrival.</li>
                        <li>To apply loyalty rewards, discounts, and generate receipts or order history records.</li>
                        <li>To prevent fraudulent transactions and maintain platform security.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">3. Payments & Third-Party Services</h3>
                      <p>
                        Online card, Apple Pay, and Google Pay transactions are processed securely via <strong className="text-white">Stripe</strong>. We do not store your full debit or credit card numbers on our servers. Order records and authentication are hosted on secure cloud infrastructure managed by Biznext Technology Ltd on behalf of Crrave Leyton.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">4. Data Retention & Your Rights</h3>
                      <p>
                        We retain order records only as long as needed to fulfil orders, provide customer support, and satisfy UK accounting and tax obligations. Under the UK General Data Protection Regulation (UK GDPR), you have the right to request access to, correction of, or deletion of your personal data.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">5. Contact Information</h3>
                      <p>
                        For food order or personal data requests, please contact <strong className="text-white">Crrave Leyton</strong> at{' '}
                        <a href="mailto:crraveleyton@gmail.com" className="text-orange-400 hover:underline">crraveleyton@gmail.com</a>{' '}
                        or call <strong className="text-white">07947 465085</strong>. For technical or platform inquiries, contact <strong className="text-white">Biznext Technology Ltd</strong> at{' '}
                        <a href="mailto:biznexttechnologyltd@gmail.com" className="text-orange-400 hover:underline">biznexttechnologyltd@gmail.com</a>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400">Effective Date: 1 January 2026</p>
                    <p>
                      Welcome to the <strong className="text-white">Crrave Leyton</strong> online ordering platform, developed and operated technically by <strong className="text-white">Biznext Technology Ltd</strong> (registered in England &amp; Wales). By placing an order or using this application, you agree to the following Terms of Service.
                    </p>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">1. Ordering & Acceptance</h3>
                      <p>
                        All menu items, meal deals, and prices are subject to availability. Submission of an order constitutes an offer to purchase; a binding contract is formed once Crrave Leyton accepts and begins preparing your order. Displayed preparation and delivery times are estimates and may vary during peak hours.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">2. Pricing, Discounts & Payments</h3>
                      <p>
                        All prices are listed in Pounds Sterling (GBP). Applicable delivery fees, service charges, bag charges, and loyalty or promotional discounts are clearly displayed in your cart prior to checkout. Payments can be made online via card, Apple Pay, or Google Pay (processed by Stripe), or via cash / card on collection where available.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">3. Allergens & Dietary Requirements</h3>
                      <p>
                        Our kitchen prepares dishes containing common allergens including nuts, dairy, gluten, eggs, sesame, and mustard. While we take care with special instructions, cross-contamination cannot be completely ruled out. Customers with severe food allergies must contact Crrave Leyton directly by phone before ordering.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">4. Cancellations & Refunds</h3>
                      <p>
                        Because food is prepared fresh to order, cancellations or modifications can only be requested before kitchen preparation begins by calling <strong className="text-white">07947 465085</strong> or <strong className="text-white">01708 361952</strong> immediately. Approved refunds for online payments are issued back to the original payment method and typically clear within 3–5 business days.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">5. Collection & Delivery</h3>
                      <p>
                        You are responsible for providing an accurate delivery address, postcode, and reachable phone number. Orders left uncollected or undeliverable due to incorrect details or lack of response at the door may still be charged in full.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">6. Intellectual Property & Governing Law</h3>
                      <p>
                        All software, ordering workflows, and technical components of this platform are the intellectual property of <strong className="text-white">Biznext Technology Ltd</strong> (© 2026 Biznext Technology Ltd. All rights reserved). Crrave Leyton trademarks and menu photography remain the property of their respective owners. These terms are governed by the laws of England and Wales.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-[#141414] flex justify-end">
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
