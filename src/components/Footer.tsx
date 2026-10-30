import { Instagram, Facebook, MapPin, Phone, Mail, Clock } from 'lucide-react';

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
  return (
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
          <p>© 2026 CRRAVE LEYTON. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
