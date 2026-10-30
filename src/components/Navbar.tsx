import { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { UserProfile } from '../App';
import { ShoppingCart, User, LogOut, Menu as MenuIcon, Shield, Instagram, Facebook, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
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

interface NavbarProps {
  user: UserProfile | null;
  setView: (view: 'home' | 'menu' | 'orders' | 'admin') => void;
  currentView: string;
  setCartOpen: (open: boolean) => void;
  cartCount: number;
  cartShake?: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

export default function Navbar({ 
  user, 
  setView, 
  currentView, 
  setCartOpen, 
  cartCount,
  cartShake = false,
  authModalOpen,
  setAuthModalOpen
}: NavbarProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname.endsWith('/admin')) {
        const isAlreadyAdmin = user?.role === 'admin' || localStorage.getItem('crrave_admin_session') === 'true';
        if (isAlreadyAdmin) {
          setView('admin');
        } else {
          setAuthModalOpen(true);
        }
        if (window.location.hash === '#admin') {
          window.history.replaceState(null, '', ' ');
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [setAuthModalOpen, setView, user]);

  const handleLogin = () => {
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('crrave_admin_session');
      await signOut(auth);
      setView('home');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-xl font-bold tracking-tighter text-orange-500 shrink-0"
            >
              <img src="/logo.png" alt="Crrave Leyton" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover border border-orange-500/50 shadow-md shadow-orange-500/20" />
              <span className="hidden sm:inline">CRRAVE LEYTON</span>
            </button>
            <div className="flex items-center gap-4 sm:gap-6">
              <button 
                onClick={() => setView('menu')}
                className={`text-[10px] sm:text-sm font-bold tracking-widest transition-colors hover:text-orange-500 ${currentView === 'menu' ? 'text-orange-500' : 'text-gray-400'}`}
              >
                MENU
              </button>
              {user && user.role !== 'admin' && (
                <button 
                  onClick={() => setView('orders')}
                  className={`text-[10px] sm:text-sm font-bold tracking-widest transition-colors hover:text-orange-500 ${currentView === 'orders' ? 'text-orange-500' : 'text-gray-400'}`}
                >
                  ORDERS
                </button>
              )}
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')}
                  className={`text-[10px] sm:text-sm font-bold tracking-widest transition-colors hover:text-orange-500 ${currentView === 'admin' ? 'text-orange-500' : 'text-gray-400'}`}
                >
                  ADMIN
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1">
              <a
                href="https://www.instagram.com/crrave.leyton/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center"
                title="Instagram @crrave.leyton"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/people/Crrave/61573871107631/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center"
                title="Facebook Crrave"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://www.tiktok.com/@crrave.leyton"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center"
                title="TikTok @crrave.leyton"
              >
                <TikTokIcon size={18} />
              </a>
            </div>
            {user?.role !== 'admin' && (
              <motion.button
                onClick={() => setCartOpen(true)}
                animate={cartShake ? { 
                  scale: [1, 1.25, 0.95, 1.2, 0.98, 1.1, 1],
                  rotate: [0, -12, 12, -8, 8, -4, 0]
                } : {}}
                transition={{ duration: 0.65, ease: 'easeInOut' }}
                className={cn(
                  "p-2.5 rounded-full transition-all relative group cursor-pointer",
                  cartShake ? "bg-orange-500/20 text-orange-500 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/50" : "text-gray-400 hover:text-white"
                )}
                title="View Shopping Cart"
              >
                <ShoppingCart size={20} className={cn("transition-colors", cartShake ? "text-orange-500" : "")} />
                {cartCount > 0 && (
                  <motion.span 
                    animate={cartShake ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0d0d0d] group-hover:scale-110 transition-transform"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </motion.button>
            )}

            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {user.role !== 'admin' && !user.isGuest && (
                  <button
                    onClick={() => setCartOpen(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                      (user.stamps ?? 0) >= 4
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20 animate-pulse"
                        : "bg-white/5 text-orange-400 border-orange-500/30 hover:border-orange-500/60"
                    )}
                    title="Customer StampCard Progress - Click to view Cart"
                  >
                    <Sparkles size={12} className={(user.stamps ?? 0) >= 4 ? "text-amber-300 animate-spin" : "text-orange-400"} />
                    <span>
                      {(user.stamps ?? 0) >= 4 ? "40% OFF READY" : `STAMPS: ${user.stamps ?? 0}/4`}
                    </span>
                  </button>
                )}
                
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-medium text-white">{user.isGuest ? 'Guest Customer' : (user.name || user.phone || 'Customer')}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{user.isGuest ? 'Guest Checkout' : user.role}</span>
                </div>
                
                {user.isGuest && (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="text-[10px] font-black tracking-widest bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-full transition-colors uppercase"
                    title="Sign in with Google to save history"
                  >
                    SIGN IN
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Sign out / Exit"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                disabled={isLoggingIn}
                className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    SIGNING IN...
                  </>
                ) : (
                  'SIGN IN'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
