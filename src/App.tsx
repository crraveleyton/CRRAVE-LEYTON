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
import { isElectronEnvironment } from './lib/print-bridge';

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
  const isElectronInitial = isElectronEnvironment();
  const [user, setUser] = useState<UserProfile | null>(() =>
    isElectronInitial
      ? {
          uid: 'electron-admin',
          name: 'Crrave Leyton Admin',
          email: 'crraveleyton@gmail.com',
          role: 'admin',
          isGuest: false,
          stamps: 0,
        }
      : null
  );
  const [loading, setLoading] = useState(() => !isElectronInitial);
  const [view, setView] = useState<'home' | 'menu' | 'orders' | 'admin'>(() =>
    isElectronInitial ? 'admin' : 'home'
  );
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

  const addToCart = (item: { id: string; name: string; price: number; variant?: string; quantity?: number }) => {
    if (user?.role === 'admin') return;
    const addQty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    
    // Normalize base item ID (stripping any accidental timestamps or suffixes)
    const baseId = item.id.split('__')[0].replace(/_\d+_\d+$/, '').replace(/_\d+$/, '');
    const cleanVariant = (item.variant || '').trim();
    
    // Unique key: if upgraded with meal deal or custom choices, key includes the variant
    // If exact same item & variant, key matches so quantity is multiplied rather than kept separate
    const itemKey = cleanVariant 
      ? `${baseId}__${cleanVariant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` 
      : baseId;

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => {
        const iBaseId = i.id.split('__')[0].replace(/_\d+_\d+$/, '').replace(/_\d+$/, '');
        const iVariant = (i.variant || '').trim();
        const existingKey = iVariant 
          ? `${iBaseId}__${iVariant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` 
          : iBaseId;
        return existingKey === itemKey;
      });

      if (existingIndex > -1) {
        return prev.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + addQty } : i
        );
      }
      return [...prev, { ...item, id: itemKey, quantity: addQty }];
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
    const runningInElectron = isElectronEnvironment();

    if (runningInElectron) {
      try {
        localStorage.setItem('crrave_admin_session', 'true');
      } catch {
        // ignore storage errors
      }
      setView('admin');
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (firebaseUser) {
        const isAdminEmail = firebaseUser.email === 'crraveleyton@gmail.com';
        const isStoredAdmin = localStorage.getItem('crrave_admin_session') === 'true';
        const shouldBeAdmin = isAdminEmail || isStoredAdmin || runningInElectron;

        if (runningInElectron) {
          setUser({
            uid: firebaseUser.uid,
            name: 'Crrave Leyton Admin',
            email: firebaseUser.email || 'crraveleyton@gmail.com',
            phone: firebaseUser.phoneNumber || '',
            role: 'admin',
            isGuest: false,
            stamps: 0,
          });
          setLoading(false);
        }

        // Subscribe to user document for live stamps updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        userUnsub = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            if (shouldBeAdmin && userData.role !== 'admin') {
              try {
                await updateDoc(userRef, { role: 'admin' });
              } catch (updateErr) {
                console.warn('Could not persist admin role to user doc:', updateErr);
              }
              setUser({
                uid: firebaseUser.uid,
                ...userData,
                role: 'admin',
                isGuest: false,
                stamps: userData.stamps ?? 0,
              } as UserProfile);
            } else {
              setUser({ 
                uid: firebaseUser.uid, 
                ...userData,
                role: shouldBeAdmin ? 'admin' : userData.role,
                isGuest: shouldBeAdmin ? false : Boolean(userData.isGuest),
                phone: userData.phone || firebaseUser.phoneNumber || '',
                stamps: userData.stamps ?? 0 
              } as UserProfile);
            }
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              name: shouldBeAdmin ? 'Crrave Leyton Admin' : (firebaseUser.displayName || firebaseUser.phoneNumber || 'Customer'),
              email: firebaseUser.email || (shouldBeAdmin ? 'crraveleyton@gmail.com' : ''),
              phone: firebaseUser.phoneNumber || '',
              role: shouldBeAdmin ? 'admin' : 'customer',
              isGuest: shouldBeAdmin ? false : firebaseUser.isAnonymous,
              stamps: 0
            };
            if (!firebaseUser.isAnonymous || shouldBeAdmin) {
              try {
                await setDoc(userRef, {
                  name: newUser.name,
                  email: newUser.email,
                  phone: newUser.phone || '',
                  role: newUser.role,
                  stamps: 0,
                }, { merge: true });
              } catch (setErr) {
                console.warn('Could not create user doc:', setErr);
              }
            }
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => {
          console.error('User doc snapshot error:', error);
          if (runningInElectron) {
            setUser({
              uid: firebaseUser.uid,
              name: 'Crrave Leyton Admin',
              email: firebaseUser.email || 'crraveleyton@gmail.com',
              role: 'admin',
              isGuest: false,
              stamps: 0,
            });
          }
          setLoading(false);
        });
      } else {
        if (runningInElectron || localStorage.getItem('crrave_admin_session') === 'true') {
          try {
            await signInAnonymously(auth);
            return;
          } catch (err) {
            console.error('Auto anonymous sign-in failed:', err);
            if (runningInElectron) {
              setUser({
                uid: 'electron-admin',
                name: 'Crrave Leyton Admin',
                email: 'crraveleyton@gmail.com',
                role: 'admin',
                isGuest: false,
                stamps: 0,
              });
            } else {
              setUser(null);
            }
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
      {/* Global Background Image with Vibrant Burger Shop Vibe & Warm Ambient Lighting */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55 sm:opacity-60 scale-105 transition-opacity duration-700"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2400&auto=format&fit=crop')`,
          }}
        />
        {/* Warm atmospheric burger diner glows & embers */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-orange-500/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[450px] h-[350px] bg-amber-500/20 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[400px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
        {/* Transparent dark gradient that allows the burger shop background to clearly show */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/80 via-black/45 to-[#0d0d0d]/85" />
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
        onSuccess={() => {
          setEditingItemId(null);
          setView('admin');
        }} 
      />
      
      <main className="relative pt-20 pb-12">
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
                  Sizzling smash burgers, flame-grilled peri chicken, loaded fries, and thick gourmet shakes. Order online {
                    discountSettings?.acceptCollectionOrders !== false && discountSettings?.acceptDeliveryOrders !== false
                      ? 'for collection or fast delivery'
                      : discountSettings?.acceptCollectionOrders !== false
                      ? 'for collection'
                      : discountSettings?.acceptDeliveryOrders !== false
                      ? 'for fast delivery'
                      : ''
                  } in Leyton!
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
                    className="mt-20 flex flex-wrap justify-center items-stretch gap-6 text-center"
                  >
                    {/* Collection Promo - Exclusive Offer (Aligned to middle) */}
                    {(discountSettings.acceptCollectionOrders !== false) && discountSettings.collectionDiscount?.enabled && (
                      <motion.div 
                        key="promo-collection"
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-orange-600 to-orange-800 rounded-3xl p-8 shadow-2xl border border-white/10 w-full sm:w-80 md:w-96 flex flex-col items-center justify-center text-center mx-auto"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Tag size={100} />
                        </div>
                        <div className="relative z-10 space-y-4 flex flex-col items-center text-center w-full">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-200 block text-center">Exclusive Offer</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center leading-tight">
                            {discountSettings.collectionDiscount.percentage}% OFF <br />
                            <span className="text-orange-200">COLLECTION</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-orange-300/30 mx-auto" />
                          <p className="text-xs font-bold text-orange-100 uppercase tracking-widest whitespace-nowrap text-center">
                            Minimum Order {formatPrice(discountSettings.collectionDiscount.minOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Delivery Promo */}
                    {(discountSettings.acceptDeliveryOrders !== false) && discountSettings.deliveryDiscount?.enabled && (
                      <motion.div 
                        key="promo-delivery"
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl border border-white/10 w-full sm:w-80 md:w-96 flex flex-col items-center justify-center text-center"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Truck size={100} />
                        </div>
                        <div className="relative z-10 space-y-4 flex flex-col items-center text-center w-full">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 block text-center">Delivery Special</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center leading-tight">
                            {discountSettings.deliveryDiscount.percentage}% OFF <br />
                            <span className="text-blue-200">DELIVERY</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-blue-300/30 mx-auto" />
                          <p className="text-xs font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap text-center">
                            Minimum Order {formatPrice(discountSettings.deliveryDiscount.minOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Free Delivery Promo */}
                    {(discountSettings.acceptDeliveryOrders !== false) && discountSettings.freeDeliveryEnabled && (
                      <motion.div 
                        key="promo-free-delivery"
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-8 shadow-2xl border border-white/10 w-full sm:w-80 md:w-96 flex flex-col items-center justify-center text-center"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Truck size={100} />
                        </div>
                        <div className="relative z-10 space-y-4 flex flex-col items-center text-center w-full">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-200 block text-center">Big Appetite Reward</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center leading-tight">
                            FREE DELIVERY <br />
                            <span className="text-green-200">APPLIED</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-green-300/30 mx-auto" />
                          <p className="text-xs font-bold text-green-100 uppercase tracking-widest whitespace-nowrap text-center">
                            On orders over {formatPrice(discountSettings.freeDeliveryMinOrder)}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Cash Discount Promo */}
                    {discountSettings.cashDiscount?.enabled && (
                      <motion.div 
                        key="promo-cash"
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden group bg-gradient-to-br from-yellow-600 to-amber-800 rounded-3xl p-8 shadow-2xl border border-white/10 w-full sm:w-80 md:w-96 flex flex-col items-center justify-center text-center"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Tag size={100} />
                        </div>
                        <div className="relative z-10 space-y-4 flex flex-col items-center text-center w-full">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-200 block text-center">Cash Payment Reward</span>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center leading-tight">
                            {discountSettings.cashDiscount.percentage}% OFF <br />
                            <span className="text-amber-200">CASH ORDERS</span>
                          </h3>
                          <div className="h-[2px] w-12 bg-amber-300/30 mx-auto" />
                          <p className="text-xs font-bold text-amber-100 uppercase tracking-widest whitespace-nowrap text-center">
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
          {view === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <OrderHistory user={user} onRepeatOrder={repeatOrder} />
            </motion.div>
          )}
          {view === 'admin' && user?.role === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AdminPanel initialEditingItemId={editingItemId} clearInitialEditing={() => setEditingItemId(null)} />
            </motion.div>
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
