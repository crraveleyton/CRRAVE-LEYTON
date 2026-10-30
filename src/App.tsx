/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot, updateDoc, signInAnonymously } from './firebase';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Truck } from 'lucide-react';
import Navbar from './components/Navbar';
import Menu from './components/Menu';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import OrderHistory from './components/OrderHistory';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { formatPrice } from './lib/utils';

export type UserRole = 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isGuest?: boolean;
  stamps?: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'menu' | 'orders' | 'admin'>('home');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountSettings, setDiscountSettings] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const editDish = (id: string) => {
    setEditingItemId(id);
    setView('admin');
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'crrave_receipt'), (snap) => {
      if (snap.exists()) {
        setDiscountSettings(snap.data());
      }
    });
    return () => unsub();
  }, []);

  const [cartShake, setCartShake] = useState(false);

  const triggerCartShake = () => {
    setCartShake(true);
    setTimeout(() => setCartShake(false), 700);
  };

  const addToCart = (item: { id: string; name: string; price: number, variant?: string }) => {
    if (user?.role === 'admin') return;
    setCart((prev) => {
      const itemKey = item.variant ? `${item.id}-${item.variant.replace(/\s+/g, '-').toLowerCase()}` : item.id;
      const existingIndex = prev.findIndex((i) => i.id === itemKey);
      if (existingIndex > -1) {
        return prev.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, id: itemKey, quantity: 1 }];
    });
    triggerCartShake();
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };

  const clearCart = () => setCart([]);

  const repeatOrder = (items: any[]) => {
    if (user?.role === 'admin') return;
    if (!items || items.length === 0) return;
    
    const itemMap = new Map<string, CartItem>();

    items.forEach((item, index) => {
      const baseId = item.id || item.menuItemId || item.name || `item-${index}`;
      const variant = item.variant || undefined;
      const itemKey = variant ? `${baseId}-${variant.replace(/\s+/g, '-').toLowerCase()}` : baseId;
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;

      if (itemMap.has(itemKey)) {
        const existing = itemMap.get(itemKey)!;
        existing.quantity += qty;
      } else {
        itemMap.set(itemKey, {
          id: itemKey,
          name: item.name,
          price,
          quantity: qty,
          variant
        });
      }
    });

    const formattedItems = Array.from(itemMap.values());
    setCart(formattedItems);
    setCartOpen(true);
    triggerCartShake();
    toast.success('Previous order loaded into cart!');
  };

  useEffect(() => {
    let userUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (firebaseUser) {
        const isAdminEmail = firebaseUser.email === 'crraveleyton@gmail.com';
        const isStoredAdmin = localStorage.getItem('crrave_admin_session') === 'true';

        // Subscribe to user document for live stamps updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        userUnsub = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            const shouldBeAdmin = (isAdminEmail || isStoredAdmin);
            if (shouldBeAdmin && userData.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              setUser({ uid: firebaseUser.uid, ...userData, role: 'admin', stamps: userData.stamps ?? 0 } as UserProfile);
            } else {
              setUser({ 
                uid: firebaseUser.uid, 
                ...userData,
                phone: userData.phone || firebaseUser.phoneNumber || '',
                stamps: userData.stamps ?? 0 
              } as UserProfile);
            }
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              name: (isAdminEmail || isStoredAdmin) ? 'Crrave Leyton Admin' : (firebaseUser.displayName || firebaseUser.phoneNumber || 'Customer'),
              email: firebaseUser.email || ((isAdminEmail || isStoredAdmin) ? 'crraveleyton@gmail.com' : ''),
              phone: firebaseUser.phoneNumber || '',
              role: (isAdminEmail || isStoredAdmin) ? 'admin' : 'customer',
              isGuest: firebaseUser.isAnonymous,
              stamps: 0
            };
            if (!firebaseUser.isAnonymous || (isAdminEmail || isStoredAdmin)) {
              await setDoc(userRef, {
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone || '',
                role: newUser.role,
                stamps: 0,
              }, { merge: true });
            }
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => {
          console.error('User doc snapshot error:', error);
          setLoading(false);
        });
      } else {
        if (localStorage.getItem('crrave_admin_session') === 'true') {
          try {
            await signInAnonymously(auth);
            return;
          } catch (err) {
            console.error('Auto anonymous sign-in failed:', err);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      if (userUnsub) userUnsub();
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden max-w-full w-full">
      {/* Global Background Image with Burger & Sizzling Grill Atmosphere */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 scale-105"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=2400&auto=format&fit=crop')`,
          }}
        />
        {/* Warm ember/flame atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-12 right-12 w-[400px] h-[300px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d] via-black/75 to-[#0d0d0d]" />
      </div>

      <Toaster position="top-center" richColors />
      <Navbar 
        user={user} 
        setView={setView} 
        currentView={view} 
        setCartOpen={setCartOpen} 
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartShake={cartShake}
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
      />

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => setView('admin')} 
      />
      
      <main className="relative z-10 pt-20 pb-12">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative min-h-[80vh] flex items-center justify-center overflow-hidden rounded-3xl"
            >
              <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 sm:py-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.7 }}
                  className="flex flex-col items-center mb-6"
                >
                  <div className="relative mb-6 group">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 opacity-60 blur-md group-hover:opacity-90 transition duration-500 animate-pulse" />
                    <img 
                      src="/logo.png" 
                      alt="Crrave Smash Burgers & Grill" 
                      className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full object-cover border-2 border-orange-500/60 shadow-2xl shadow-orange-600/40"
                    />
                  </div>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-black tracking-widest uppercase mb-3 shadow-lg shadow-orange-500/10">
                    <span>🔥</span> SMASH BURGERS • GRILL • SHAKES <span>🔥</span>
                  </div>

                  <h1 className="text-[52px] sm:text-[72px] md:text-[88px] font-black not-italic tracking-tighter bg-gradient-to-b from-white via-orange-50 to-orange-500 bg-clip-text text-transparent drop-shadow-2xl leading-[1.05]">
                    CRRAVE <span className="text-orange-500">LEYTON</span>
                  </h1>
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow-lg"
                >
                  Sizzling smash burgers, flame-grilled peri chicken, loaded fries, and thick gourmet shakes. Order online for collection or fast delivery in Leyton!
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex justify-center"
                >
                  {user?.role !== 'admin' && (
                    <button
                      onClick={() => setView('menu')}
                      className="px-12 py-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-full font-black text-lg tracking-wide uppercase transition-all transform hover:scale-105 shadow-2xl shadow-orange-600/30 active:scale-95 flex items-center gap-3"
                    >
                      <span>🍔</span> Order Online Now
                    </button>
                  )}
                </motion.div>

                {/* Home Page Promotions */}
                {discountSettings && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left"
                  >
                    {/* Collection Promo */}
                    {discountSettings.collectionDiscount?.enabled && (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-orange-600 to-orange-800 rounded-3xl p-8 shadow-2xl border border-white/10"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Tag size={100} />
                        </div>
                        <div className="relative z-10 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-200">Exclusive Offer</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            {discountSettings.collectionDiscount.percentage}% OFF <br />
                            <span className="text-orange-200">COLLECTION</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-orange-300/30" />
                          <p className="text-xs font-bold text-orange-100 uppercase tracking-widest whitespace-nowrap">
                            Minimum Order {formatPrice(discountSettings.collectionDiscount.minOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Delivery Promo */}
                    {discountSettings.deliveryDiscount?.enabled && (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl border border-white/10"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Truck size={100} />
                        </div>
                        <div className="relative z-10 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200">Delivery Special</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            {discountSettings.deliveryDiscount.percentage}% OFF <br />
                            <span className="text-blue-200">DELIVERY</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-blue-300/30" />
                          <p className="text-xs font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap">
                            Minimum Order {formatPrice(discountSettings.deliveryDiscount.minOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Free Delivery Promo */}
                    {discountSettings.freeDeliveryEnabled && (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-8 shadow-2xl border border-white/10 md:col-span-2 lg:col-span-1"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Truck size={100} />
                        </div>
                        <div className="relative z-10 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-200">Big Appetite Reward</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            FREE DELIVERY <br />
                            <span className="text-green-200">APPLIED</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-green-300/30" />
                          <p className="text-xs font-bold text-green-100 uppercase tracking-widest whitespace-nowrap">
                            On orders over {formatPrice(discountSettings.freeDeliveryMinOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Cash Discount Promo */}
                    {discountSettings.cashDiscount?.enabled && (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-yellow-600 to-amber-800 rounded-3xl p-8 shadow-2xl border border-white/10 md:col-span-2 lg:col-span-1"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Tag size={100} />
                        </div>
                        <div className="relative z-10 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-200">Cash Payment Reward</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            {discountSettings.cashDiscount.percentage}% OFF <br />
                            <span className="text-amber-200">CASH ORDERS</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-amber-300/30" />
                          <p className="text-xs font-bold text-amber-100 uppercase tracking-widest whitespace-nowrap">
                            Minimum Order {formatPrice(discountSettings.cashDiscount.minOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu user={user} addToCart={addToCart} editDish={editDish} />
            </motion.div>
          )}
          {view === 'orders' && <OrderHistory user={user} onRepeatOrder={repeatOrder} />}
          {view === 'admin' && user?.role === 'admin' && (
            <AdminPanel initialEditingItemId={editingItemId} clearInitialEditing={() => setEditingItemId(null)} />
          )}
        </AnimatePresence>
      </main>

      {user?.role !== 'admin' && (
        <Cart 
          isOpen={cartOpen} 
          setIsOpen={setCartOpen} 
          user={user} 
          cart={cart} 
          removeFromCart={removeFromCart} 
          updateQuantity={updateQuantity} 
          clearCart={clearCart}
          onRepeatOrder={repeatOrder}
          setAuthModalOpen={setAuthModalOpen}
        />
      )}
      {view !== 'admin' && <Footer />}
    </div>
  );
}
