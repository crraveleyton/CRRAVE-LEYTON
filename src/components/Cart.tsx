import { useEffect, useState, useMemo, useRef } from 'react';
import { UserProfile, CartItem } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, Trash2, CreditCard, Truck, Store, ExternalLink, CheckCircle2, Clock, Loader2, AlertTriangle, Tag, Banknote, RotateCcw, Zap, Calendar, ChevronDown, ChevronRight, Sparkles, Gift, Check, Phone, User } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, auth, doc, getDoc, setDoc, updateDoc, onSnapshot, signInAnonymously } from '../firebase';
import { toast } from 'sonner';
import { isOpenNow as checkIsOpenNow, BUSINESS_HOURS, getOpeningTimesText, getIsoDateString, getRestaurantClosedStatus, normalizeBusinessHours, getLondonNow } from '../lib/businessHours';
import { fetchSortingMetadata, sortOrderItems, CategoryWithOrder, MenuItemWithOrder } from '../lib/orderSorter';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: UserProfile | null;
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  onRepeatOrder?: (items: any[]) => void;
  setAuthModalOpen?: (open: boolean) => void;
}

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import PaymentErrorBoundary from './PaymentErrorBoundary';

const stripePromiseCache: Record<string, Promise<any>> = {};

function getStripePromise(publishableKey?: string | null) {
  const key = publishableKey?.trim();
  if (!key) return null;
  if (!stripePromiseCache[key]) {
    stripePromiseCache[key] = loadStripe(key).catch((err) => {
      console.warn('Failed to load Stripe.js (offline or unavailable):', err);
      return null;
    });
  }
  return stripePromiseCache[key];
}

export default function Cart({ isOpen, setIsOpen, user, cart, removeFromCart, updateQuantity, clearCart, onRepeatOrder, setAuthModalOpen }: CartProps) {
  const [stripePublishableKey, setStripePublishableKey] = useState<string>(() => {
    return (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || '';
  });
  const [orderType, setOrderType] = useState<'collection' | 'delivery'>('collection');
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [houseName, setHouseName] = useState('');
  const [streetName, setStreetName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_on_collection' | 'pay_online'>('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'ready' | 'shipped' | 'delivered' | 'collected'>('pending');
  const [estimate, setEstimate] = useState<string | null>(null);
  const [discountSettings, setDiscountSettings] = useState<any>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(true);
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAuthOrGuestModal, setShowAuthOrGuestModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [useStampReward, setUseStampReward] = useState(true);

  const activeStripePromise = useMemo(() => {
    const key = stripePublishableKey || discountSettings?.stripePublishableKey;
    return getStripePromise(key);
  }, [stripePublishableKey, discountSettings?.stripePublishableKey]);

  const stripeElementsOptions = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorPrimary: '#ea580c',
          colorBackground: '#171717',
          colorText: '#ffffff',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          borderRadius: '16px',
        },
      },
    };
  }, [clientSecret]);

  // Concurrency & deduplication refs to prevent duplicate order placement & duplicate payment verification
  const isPlacingOrderRef = useRef(false);
  const isVerifyingPaymentRef = useRef(false);
  const processedPaymentIntentsRef = useRef<Set<string>>(new Set());

  const [categoriesMetadata, setCategoriesMetadata] = useState<CategoryWithOrder[]>([]);
  const [menuItemsMetadata, setMenuItemsMetadata] = useState<MenuItemWithOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSortingMetadata().then(({ categories, menuItems }) => {
        setCategoriesMetadata(categories);
        setMenuItemsMetadata(menuItems);
      });
      try {
        const storedLastOrder = localStorage.getItem('crrave_last_order');
        if (storedLastOrder) {
          setLastOrder(JSON.parse(storedLastOrder));
        }
      } catch (e) {
        console.error('Error loading last order:', e);
      }
    }
  }, [isOpen]);

  const sortedCart = useMemo(() => {
    if (categoriesMetadata.length > 0 || menuItemsMetadata.length > 0) {
      return sortOrderItems(cart, categoriesMetadata, menuItemsMetadata);
    }
    return cart;
  }, [cart, categoriesMetadata, menuItemsMetadata]);

  const businessHours = useMemo(() => {
    return normalizeBusinessHours(discountSettings?.businessHours);
  }, [discountSettings?.businessHours]);

  const isOpenNow = useMemo(() => {
    return checkIsOpenNow(discountSettings?.businessHours, discountSettings?.closedDates);
  }, [discountSettings?.businessHours, discountSettings?.closedDates]);

  const todayStr = getIsoDateString();
  const closedStatusToday = getRestaurantClosedStatus(todayStr, discountSettings?.closedDates);

  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getIsoDateString(tomorrowObj);
  const closedStatusTomorrow = getRestaurantClosedStatus(tomorrowStr, discountSettings?.closedDates);

  const getDynamicTimeSlots = (forTomorrow = false) => {
    const london = getLondonNow();
    const day = forTomorrow ? (london.day + 1) % 7 : london.day;
    const schedule = businessHours[day];
    if (!schedule || schedule.closed) return [];
    
    // We only show ASAP for today when restaurant is currently open
    const slots: string[] = [];
    if (!forTomorrow && isOpenNow) {
      slots.push('ASAP');
    }
    const prefix = forTomorrow ? "Tomorrow " : "";
    
    // Availability buffer: 60 minutes after opening for delivery, 20 minutes after opening for collection
    const bufferMinutes = orderType === 'collection' ? 20 : 60;
    const startMins = schedule.openMins + bufferMinutes;
    const endMins = schedule.closeMins;

    let currentMins = startMins;
    while (currentMins <= endMins) {
      const hour = Math.floor(currentMins / 60);
      const min = currentMins % 60;
      const formattedHour = hour >= 24 ? (hour % 24) : hour;
      const timeStr = `${formattedHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      slots.push(`${prefix}${timeStr}`);
      
      // Align to 15-min increments
      if (currentMins === startMins && currentMins % 15 !== 0) {
        currentMins += (15 - (currentMins % 15));
      } else {
        currentMins += 15;
      }
    }
    
    return slots;
  };

  const getFilteredTimeSlots = () => {
    const london = getLondonNow();
    const day = london.day;
    const currentMins = london.currentMins;

    // Today's schedule
    const schedule = businessHours[day];
    if (!schedule || schedule.closed) return [];

    // Buffer: 60 mins for delivery, 20 mins for collection
    const bufferMinutes = orderType === 'collection' ? 20 : 60;

    // If restaurant is closed today for a scheduled closure, no slots for today
    const todaySlots = closedStatusToday.isClosed
      ? []
      : getDynamicTimeSlots(false).filter(slot => {
          if (slot === 'ASAP') return isOpenNow;
          
          const timeStr = slot.replace("Tomorrow ", "");
          const [slotHours, slotMinutes] = timeStr.split(':').map(Number);
          let slotTimeInMins = slotHours * 60 + slotMinutes;
          // 00:00 closing time is midnight (1440 mins)
          if (slotHours === 0 && slotMinutes === 0) {
            slotTimeInMins = 1440;
          }
          
          // Earliest time slot allowed based on opening time
          const minFromOpening = schedule.openMins + bufferMinutes;
          // Earliest time slot allowed based on current time
          const minFromCurrent = currentMins + bufferMinutes;
          
          return slotTimeInMins >= minFromOpening && slotTimeInMins >= minFromCurrent;
        });

    // Tomorrow's slots visibility logic:
    // Visible if today is closed, or after today's closing hours, or if no slots remain today
    let tomorrowSlots: string[] = [];
    if (!closedStatusTomorrow.isClosed && (closedStatusToday.isClosed || currentMins > schedule.closeMins || (todaySlots.length === 0 && !isOpenNow && currentMins >= schedule.openMins))) {
      tomorrowSlots = getDynamicTimeSlots(true);
    }

    return [...todaySlots, ...tomorrowSlots];
  };

  const filteredTimeSlots = getFilteredTimeSlots();

  useEffect(() => {
    const slots = getFilteredTimeSlots();
    if (!isOpenNow && !isScheduling) {
      setIsScheduling(true);
    }
    if (
      selectedTimeSlot === '' || 
      (selectedTimeSlot === 'ASAP' && !isOpenNow) ||
      (selectedTimeSlot !== 'ASAP' && !slots.includes(selectedTimeSlot))
    ) {
      if (isOpenNow && !isScheduling) {
        setSelectedTimeSlot('ASAP');
      } else if (slots.length > 0) {
        const firstScheduled = slots.find(s => s !== 'ASAP') || slots[0];
        setSelectedTimeSlot(firstScheduled);
      }
    }
  }, [orderType, isOpenNow, selectedTimeSlot, discountSettings, isScheduling]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'crrave_receipt'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDiscountSettings({
          ...data,
          allowCashOrders: data.allowCashOrders !== undefined ? data.allowCashOrders : true,
          acceptDeliveryOrders: data.acceptDeliveryOrders !== undefined ? data.acceptDeliveryOrders : true,
          acceptCollectionOrders: data.acceptCollectionOrders !== undefined ? data.acceptCollectionOrders : true,
          stripePublishableKey: data.stripePublishableKey || '',
          collectionDiscount: data.collectionDiscount || { enabled: false, minOrder: 20, percentage: 10 },
          deliveryDiscount: data.deliveryDiscount || { enabled: false, minOrder: 30, percentage: 5 },
          cashDiscount: data.cashDiscount || { enabled: false, minOrder: 15, percentage: 5 },
          stampCard: data.stampCard || { enabled: true, percentagePerOrder: 10 },
          minCollectionOrder: data.minCollectionOrder || 0,
          minDeliveryOrder: data.minDeliveryOrder || 0,
          freeDeliveryEnabled: data.freeDeliveryEnabled || false,
          freeDeliveryMinOrder: data.freeDeliveryMinOrder || 0,
          localDeliveryFee: data.localDeliveryFee !== undefined ? data.localDeliveryFee : 1.5,
          deliveryFees: data.deliveryFees || [
            { postcode: 'E10', fee: 1.5 },
            { postcode: 'E11', fee: 2.5 },
            { postcode: 'E17', fee: 3.0 },
            { postcode: 'E5', fee: 3.5 }
          ]
        });
      } else {
        setDiscountSettings({
          allowCashOrders: true,
          acceptDeliveryOrders: true,
          acceptCollectionOrders: true,
          stripePublishableKey: '',
          collectionDiscount: { enabled: false, minOrder: 20, percentage: 10 },
          deliveryDiscount: { enabled: false, minOrder: 30, percentage: 5 },
          cashDiscount: { enabled: false, minOrder: 15, percentage: 5 },
          stampCard: { enabled: true, percentagePerOrder: 10 },
          localDeliveryFee: 1.5,
          deliveryFees: [
            { postcode: 'E10', fee: 1.5 },
            { postcode: 'E11', fee: 2.5 },
            { postcode: 'E17', fee: 3.0 },
            { postcode: 'E5', fee: 3.5 }
          ]
        });
      }
    });
    return () => unsub();
  }, []);

  // Fetch publishable key from settings or backend API immediately
  useEffect(() => {
    fetch('/api/stripe-config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.publishableKey && data.publishableKey.trim() !== '') {
          setStripePublishableKey(data.publishableKey.trim());
        }
      })
      .catch((err) => console.warn('Could not load stripe config:', err));
  }, []);

  useEffect(() => {
    if (discountSettings?.stripePublishableKey && discountSettings.stripePublishableKey.trim() !== '') {
      setStripePublishableKey((curr) => curr || discountSettings.stripePublishableKey.trim());
    }
  }, [discountSettings?.stripePublishableKey]);

  useEffect(() => {
    if (discountSettings?.acceptDeliveryOrders === false && orderType === 'delivery') {
      if (discountSettings?.acceptCollectionOrders !== false) {
        setOrderType('collection');
      }
    } else if (discountSettings?.acceptCollectionOrders === false && orderType === 'collection') {
      if (discountSettings?.acceptDeliveryOrders !== false) {
        setOrderType('delivery');
      }
    }
  }, [discountSettings?.acceptDeliveryOrders, discountSettings?.acceptCollectionOrders, orderType]);

  useEffect(() => {
    const calculateDeliveryFee = () => {
      if (orderType === 'collection') {
        setDeliveryFee(0);
        setDistance(null);
        setIsValidAddress(true);
        return;
      }

      const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
      if (cleanPostcode.length < 2) {
        setDeliveryFee(0);
        setDistance(null);
        return;
      }

      // 1. Check for local E10 (Always takes priority)
      if (cleanPostcode.startsWith('E10') || cleanPostcode.startsWith('NN96')) {
        setDeliveryFee(discountSettings?.localDeliveryFee !== undefined ? discountSettings.localDeliveryFee : 1.5);
        setDistance(0);
        setIsValidAddress(true);
        return;
      }

      // 2. Check for postcode matches from the admin rules
      const rules = discountSettings?.deliveryFees || [];
      
      // Try to find the best match (longest matching prefix)
      // e.g. if we have rule for "NN10" and "NN10 1", and user enters "NN10 1LS"
      // it should ideally match "NN10 1" if available.
      
      let matchedFee: number | null = null;
      let longestMatchLen = -1;

      rules.forEach((rule: any) => {
        const ruleClean = (rule.postcode || '').replace(/\s/g, '').toUpperCase();
        if (ruleClean && cleanPostcode.startsWith(ruleClean)) {
          if (ruleClean.length > longestMatchLen) {
            longestMatchLen = ruleClean.length;
            matchedFee = rule.fee;
          }
        }
      });

      if (matchedFee !== null) {
        setDeliveryFee(matchedFee);
        setDistance(0); // Set to 0 to indicate valid
        setIsValidAddress(true);
      } else {
        setIsValidAddress(false);
        setDeliveryFee(0);
        setDistance(null);
      }
    };

    calculateDeliveryFee();
  }, [postcode, orderType, discountSettings]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setOrderSuccess(false);
        setEstimate(null);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    // 1. Handle cross-combination: Card on Collection is only for collection
    if (orderType === 'delivery' && paymentMethod === 'card_on_collection') {
      setPaymentMethod('cash');
    }
  }, [orderType, paymentMethod, discountSettings]);

  useEffect(() => {
    if (user) {
      if (!customerName && user.name && user.name !== 'Guest' && user.name !== 'Customer') {
        setCustomerName(user.name);
      }
      if (!email && user.email) {
        setEmail(user.email);
      }
      if (!phone && user.phone) {
        setPhone(user.phone);
      }
    }
  }, [user]);

  // Handle browser/device back button smoothly when cart or payment modal is open
  useEffect(() => {
    if (isOpen || showPaymentModal) {
      window.history.pushState({ modalState: true }, '');

      const handlePopState = () => {
        if (showPaymentModal) {
          setShowPaymentModal(false);
          setShowStripe(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, showPaymentModal]);

  // Verify and recover online payments if customer closed/refreshed page, switched apps on iOS/Safari, or hit back button after Stripe payment
  useEffect(() => {
    const verifyPendingPayment = async () => {
      if (isVerifyingPaymentRef.current) return;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const clientSecretInUrl = urlParams.get('payment_intent_client_secret');
        const paymentIntentInUrl = urlParams.get('payment_intent');
        const isSuccessParam = urlParams.get('payment_success') === 'true';
        const hasUrlRedirectParam = Boolean(clientSecretInUrl || paymentIntentInUrl || isSuccessParam);
        
        const pendingRaw = localStorage.getItem('crrave_pending_online_order') || sessionStorage.getItem('crrave_pending_online_order');

        if (!pendingRaw && !hasUrlRedirectParam) return;

        let pendingOrder: any = null;
        if (pendingRaw) {
          try {
            pendingOrder = JSON.parse(pendingRaw);
            if (pendingOrder.timestamp && Date.now() - pendingOrder.timestamp > 24 * 60 * 60 * 1000) {
              localStorage.removeItem('crrave_pending_online_order');
              sessionStorage.removeItem('crrave_pending_online_order');
              return;
            }
          } catch (e) {
            console.error('Error parsing pending order:', e);
          }
        }

        // Only verify if customer returned from a payment redirect or actually clicked pay/submitted!
        // Prevents premature verification while user is still viewing or typing into the payment form
        if (!hasUrlRedirectParam && !pendingOrder?.paymentSubmitted) {
          return;
        }

        const secretToCheck = clientSecretInUrl || pendingOrder?.clientSecret;
        const piToCheck = paymentIntentInUrl || (secretToCheck ? secretToCheck.split('_secret_')[0] : null);

        if (!secretToCheck && !piToCheck) return;
        const cleanPi = String(piToCheck).trim();

        if (processedPaymentIntentsRef.current.has(cleanPi)) {
          return;
        }

        isVerifyingPaymentRef.current = true;

        // 1. Try confirming via server endpoint first
        let confirmedOnServer = false;
        let createdOrderId = '';

        try {
          const resp = await fetch('/api/confirm-order-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: cleanPi,
              clientSecret: secretToCheck,
              orderData: pendingOrder,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.orderId) {
              confirmedOnServer = true;
              createdOrderId = data.orderId;
            }
          }
        } catch (serverErr) {
          console.warn('Server confirmation attempt warning:', serverErr);
        }

        if (confirmedOnServer && createdOrderId) {
          processedPaymentIntentsRef.current.add(cleanPi);
          setPlacedOrderId(createdOrderId);
          setOrderSuccess(true);
          setIsOpen(true);
          clearCart();
          localStorage.removeItem('crrave_pending_online_order');
          sessionStorage.removeItem('crrave_pending_online_order');
          setShowStripe(false);
          setShowPaymentModal(false);
          toast.success('Online payment verified & order sent to kitchen!');
          if (clientSecretInUrl || paymentIntentInUrl || isSuccessParam) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return;
        }

        // 2. Client-side fallback check via Stripe SDK
        const stripe = await activeStripePromise;
        if (!stripe || !secretToCheck) return;

        const { paymentIntent } = await stripe.retrievePaymentIntent(secretToCheck);
        if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
          processedPaymentIntentsRef.current.add(paymentIntent.id);
          const targetDocRef = doc(db, 'orders', paymentIntent.id);
          const existingSnap = await getDoc(targetDocRef);

          if (!existingSnap.exists()) {
            const q = query(collection(db, 'orders'), where('paymentId', '==', paymentIntent.id));
            const snap = await getDocs(q);

            if (snap.empty) {
              let orderUser = user;
              if (!orderUser) {
                try {
                  const cred = await signInAnonymously(auth);
                  orderUser = {
                    uid: cred.user.uid,
                    name: pendingOrder?.customerName || 'Customer',
                    email: pendingOrder?.email || '',
                    role: 'customer'
                  };
                } catch (authErr) {
                  console.error('Anonymous sign-in for recovery failed:', authErr);
                }
              }

              const recoveredDoc = {
                userId: orderUser?.uid || 'guest_' + paymentIntent.id.slice(-8),
                customerName: (pendingOrder?.customerName || 'Customer').trim(),
                email: (pendingOrder?.email || orderUser?.email || '').trim(),
                items: pendingOrder?.items || [{ name: 'Online Order (Apple Pay / Card)', price: paymentIntent.amount / 100, quantity: 1 }],
                subtotal: pendingOrder?.subtotal || (paymentIntent.amount / 100),
                discountAmount: pendingOrder?.discountAmount || 0,
                discountPercentage: pendingOrder?.discountPercentage || 0,
                stampCardDiscount: pendingOrder?.stampCardDiscount || 0,
                stampCardPercentage: pendingOrder?.stampCardPercentage || 0,
                stampCardApplied: pendingOrder?.stampCardApplied || false,
                deliveryFee: pendingOrder?.deliveryFee || 0,
                distance: pendingOrder?.distance || null,
                total: pendingOrder?.total || (paymentIntent.amount / 100),
                status: 'pending',
                type: pendingOrder?.orderType || 'delivery',
                phone: (pendingOrder?.phone || '').trim(),
                address: pendingOrder?.address || '',
                houseNumber: pendingOrder?.houseNumber || '',
                houseName: pendingOrder?.houseName || '',
                streetName: pendingOrder?.streetName || '',
                areaName: pendingOrder?.areaName || '',
                postcode: pendingOrder?.postcode || '',
                timeSlot: pendingOrder?.selectedTimeSlot || 'ASAP',
                paymentMethod: 'pay_online',
                paymentId: paymentIntent.id,
                notes: pendingOrder?.orderNotes || '',
                estimate: '',
                createdAt: serverTimestamp(),
              };

              await setDoc(targetDocRef, recoveredDoc, { merge: true });

              if (orderUser && !orderUser.isGuest) {
                try {
                  const uRef = doc(db, 'users', orderUser.uid);
                  if (pendingOrder?.stampCardApplied) {
                    await updateDoc(uRef, { stamps: 0, lastOrderAt: serverTimestamp() });
                  } else {
                    const uSnap = await getDoc(uRef);
                    const cur = uSnap.exists() ? (uSnap.data().stamps ?? 0) : 0;
                    await updateDoc(uRef, { stamps: Math.min(4, cur + 1), lastOrderAt: serverTimestamp() });
                  }
                } catch (e) {
                  console.warn('Error updating stamp card during payment recovery:', e);
                }
              }

              setPlacedOrderId(paymentIntent.id);
            } else {
              setPlacedOrderId(snap.docs[0].id);
            }
          } else {
            setPlacedOrderId(paymentIntent.id);
          }

          setOrderSuccess(true);
          setIsOpen(true);
          clearCart();
          localStorage.removeItem('crrave_pending_online_order');
          sessionStorage.removeItem('crrave_pending_online_order');
          setShowStripe(false);
          setShowPaymentModal(false);
          toast.success('Online payment verified & order sent to kitchen!');

          if (clientSecretInUrl || paymentIntentInUrl || isSuccessParam) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (err) {
        console.error('Error recovering pending payment:', err);
      } finally {
        isVerifyingPaymentRef.current = false;
      }
    };

    // Run immediately on mount
    verifyPendingPayment();

    // Listen on window focus, visibilitychange, and pageshow (crucial for iOS Safari Apple Pay sheet closing)
    const handleReactivation = () => {
      verifyPendingPayment();
    };

    window.addEventListener('focus', handleReactivation);
    window.addEventListener('popstate', handleReactivation);
    window.addEventListener('pageshow', handleReactivation);
    document.addEventListener('visibilitychange', handleReactivation);

    return () => {
      window.removeEventListener('focus', handleReactivation);
      window.removeEventListener('popstate', handleReactivation);
      window.removeEventListener('pageshow', handleReactivation);
      document.removeEventListener('visibilitychange', handleReactivation);
    };
  }, [user]);

  const isDeliveryAvailable = discountSettings?.acceptDeliveryOrders !== false;
  const isCollectionAvailable = discountSettings?.acceptCollectionOrders !== false;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  let currentDeliveryFee = deliveryFee;
  if (orderType === 'delivery' && isDeliveryAvailable && discountSettings?.freeDeliveryEnabled && subtotal >= discountSettings.freeDeliveryMinOrder) {
    currentDeliveryFee = 0;
  }

  let discountAmount = 0;
  let discountPercentage = 0;
  
  if (discountSettings) {
    const cashRule = discountSettings.cashDiscount;
    if (paymentMethod === 'cash' && cashRule?.enabled) {
      // If cash discount is enabled, customer paying cash only gets cash discount (if min order met)
      if (subtotal >= cashRule.minOrder) {
        discountPercentage = cashRule.percentage;
        discountAmount = (subtotal * discountPercentage) / 100;
      }
    } else {
      // Normal discount logic (collection or delivery)
      const rule = (orderType === 'delivery' && isDeliveryAvailable)
        ? discountSettings.deliveryDiscount
        : (isCollectionAvailable ? discountSettings.collectionDiscount : null);
      if (rule?.enabled && subtotal >= rule.minOrder) {
        discountPercentage = rule.percentage;
        discountAmount = (subtotal * discountPercentage) / 100;
      }
    }
  }
  
  const stampCardConfig = discountSettings?.stampCard || { enabled: true, percentagePerOrder: 10 };
  const stampCardEnabled = stampCardConfig.enabled !== false;
  const stampPercentagePerOrder = Number(stampCardConfig.percentagePerOrder) || 10;
  const stampRewardPercentage = stampPercentagePerOrder * 4; // 10% x 4 = 40%
  const userStamps = (user && !user.isGuest) ? (user.stamps ?? 0) : 0;
  const isStampRewardEligible = stampCardEnabled && (user && !user.isGuest) && userStamps >= 4;

  const stampCardDiscount = (isStampRewardEligible && useStampReward)
    ? Math.round(((subtotal * stampRewardPercentage) / 100) * 100) / 100
    : 0;

  const total = Math.max(0, subtotal - discountAmount - stampCardDiscount + currentDeliveryFee);

  const minThreshold = discountSettings 
    ? (orderType === 'collection' ? (Number(discountSettings.minCollectionOrder) || 0) : (Number(discountSettings.minDeliveryOrder) || 0))
    : 0;
  
  const minOrderWarning = subtotal < minThreshold
    ? `Minimum order for ${orderType} is ${formatPrice(minThreshold)}`
    : null;

  // filteredTimeSlots is already declared above

  useEffect(() => {
    if (selectedTimeSlot === 'ASAP' && !isOpenNow && filteredTimeSlots.length > 0) {
      // If closed but we have future slots, pick the first one
      const futureSlots = filteredTimeSlots.filter(s => s !== 'ASAP');
      if (futureSlots.length > 0) {
        setSelectedTimeSlot(futureSlots[0]);
      }
    } else if (selectedTimeSlot !== 'ASAP' && !filteredTimeSlots.includes(selectedTimeSlot)) {
      setSelectedTimeSlot(filteredTimeSlots[0] || 'ASAP');
    }
  }, [filteredTimeSlots, selectedTimeSlot, isOpenNow]);


  useEffect(() => {
    if (placedOrderId) {
      const unsub = onSnapshot(doc(db, 'orders', placedOrderId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLiveStatus(data.status);
          if (data.estimate) {
            setEstimate(data.estimate);
          }
        }
      });
      return () => unsub();
    }
  }, [placedOrderId]);

  const handleCheckout = async () => {
    if (!discountSettings) {
      toast.error('Loading settings... please try again in a moment.');
      return;
    }

    if (!isDeliveryAvailable && orderType === 'delivery') {
      if (isCollectionAvailable) {
        toast.error('Delivery orders are currently closed. Switched to collection.');
        setOrderType('collection');
      } else {
        toast.error('Orders are currently paused. Please check back later.');
      }
      return;
    }

    if (!isCollectionAvailable && orderType === 'collection') {
      if (isDeliveryAvailable) {
        toast.error('Collection orders are currently closed. Switched to delivery.');
        setOrderType('delivery');
      } else {
        toast.error('Orders are currently paused. Please check back later.');
      }
      return;
    }
    
    if (minOrderWarning) {
      toast.error(minOrderWarning);
      return;
    }

    if (!isOpenNow && selectedTimeSlot === 'ASAP') {
      toast.error('Restaurant is currently closed. Please select a scheduled time slot.');
      return;
    }

    // If customer is not signed in and has not filled their contact info, show the clear Sign In vs Guest choice
    const trimmedName = (customerName || '').trim();
    const trimmedPhone = (phone || '').trim();
    const trimmedEmail = (email || '').trim();

    if (!user && !trimmedName && !trimmedPhone) {
      setShowAuthOrGuestModal(true);
      return;
    }

    // Validate fields and build inline validation errors
    const errors: Record<string, string> = {};

    if (!trimmedName) {
      errors.name = 'Full name is required';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    }

    if ((!user || user.isGuest) && !trimmedEmail) {
      errors.email = 'Email is required for order receipt & tracking';
    }

    if (orderType === 'delivery') {
      const trimmedHouseNum = (houseNumber || '').trim();
      const trimmedHouseNm = (houseName || '').trim();
      const trimmedStreet = (streetName || '').trim();
      const trimmedArea = (areaName || '').trim();
      const trimmedPost = (postcode || '').trim();

      if (!trimmedHouseNum && !trimmedHouseNm) {
        errors.house = 'House number or name is required';
      }
      if (!trimmedStreet) {
        errors.street = 'Street name is required';
      }
      if (!trimmedArea) {
        errors.area = 'Area/town is required';
      }
      if (!trimmedPost) {
        errors.postcode = 'Postcode is required';
      } else if (!isValidAddress) {
        errors.postcode = 'This postcode is out of coverage';
      }
    }

    if (!selectedTimeSlot) {
      errors.timeSlot = 'Please select a preferred time slot';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fill in the highlighted details to proceed');
      const targetId = errors.name ? 'cart-customer-name' :
        errors.phone ? 'cart-customer-phone' :
        errors.email ? 'cart-customer-email' :
        errors.house ? 'cart-house-number' :
        errors.street ? 'cart-street-name' :
        errors.postcode ? 'cart-postcode' :
        'cart-customer-details';
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setValidationErrors({});
    // Opens the Payment Selection Modal with blurred background
    setShowPaymentModal(true);
  };

  const handleConfirmPaymentMethod = async () => {
    if (paymentMethod === 'cash' && discountSettings?.allowCashOrders === false) {
      toast.error('Cash orders are currently not accepted by the restaurant');
      setPaymentMethod(orderType === 'collection' ? 'card_on_collection' : 'pay_online');
      return;
    }

    if (paymentMethod === 'pay_online' && total < 0.30) {
      toast.error('The minimum amount for online payments is £0.30. Please add more items or choose another payment method.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === 'pay_online' && !showStripe) {
        const isCollection = orderType === 'collection';
        const formattedAddress = isCollection 
          ? '' 
          : `${(houseNumber || '').trim() ? (houseNumber || '').trim() + ' ' : ''}${(houseName || '').trim() ? (houseName || '').trim() + '\n' : ''}${(streetName || '').trim()}\n${(areaName || '').trim()}\n${(postcode || '').trim()}`;

        const pendingOrderPayload = {
          customerName: (customerName || '').trim() || 'Customer',
          email: (email || '').trim() || (user?.email || ''),
          items: sortedCart,
          subtotal,
          discountAmount,
          discountPercentage,
          stampCardDiscount: isStampRewardEligible && useStampReward ? stampCardDiscount : 0,
          stampCardPercentage: isStampRewardEligible && useStampReward ? stampRewardPercentage : 0,
          stampCardApplied: isStampRewardEligible && useStampReward,
          deliveryFee: isCollection ? 0 : currentDeliveryFee,
          distance: isCollection ? null : distance,
          total,
          orderType,
          phone: (phone || '').trim(),
          address: isCollection ? '' : formattedAddress,
          houseNumber: isCollection ? '' : (houseNumber || '').trim(),
          houseName: isCollection ? '' : (houseName || '').trim(),
          streetName: isCollection ? '' : (streetName || '').trim(),
          areaName: isCollection ? '' : (areaName || '').trim(),
          postcode: isCollection ? '' : (postcode || '').trim(),
          selectedTimeSlot,
          paymentMethod: 'pay_online',
          orderNotes: (orderNotes || '').trim(),
        };

        // Create Payment Intent with complete order metadata
        let response;
        try {
          response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total, orderData: pendingOrderPayload }),
          });
        } catch (fetchError) {
          throw new Error('Could not connect to the payment server. Please ensure your connection is active.');
        }

        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        if (!response.ok) {
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = JSON.parse(responseText);
              throw new Error(errorData.error || `Payment server error (${response.status})`);
            } catch (e) {
              // fall through to text error
            }
          }
          console.error('Server error response:', responseText);
          throw new Error(`The payment server returned an error (${response.status}): ${responseText.substring(0, 80)}`);
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', responseText);
          throw new Error('Received unexpected response format from payment server.');
        }

        if (data.clientSecret) {
          if (data.publishableKey && (!stripePublishableKey || stripePublishableKey !== data.publishableKey)) {
            setStripePublishableKey(data.publishableKey);
          }
          const effectiveKey = data.publishableKey || stripePublishableKey || discountSettings?.stripePublishableKey;
          if (!effectiveKey || effectiveKey.trim() === '') {
            toast.error('Online payments are currently unavailable. Switching to cash or card upon collection.');
            setPaymentMethod(orderType === 'collection' ? 'card_on_collection' : 'cash');
            setIsSubmitting(false);
            return;
          }

          const fullPendingOrder = {
            ...pendingOrderPayload,
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            timestamp: Date.now()
          };

          // Save pending order to both localStorage and sessionStorage
          try {
            localStorage.setItem('crrave_pending_online_order', JSON.stringify(fullPendingOrder));
            sessionStorage.setItem('crrave_pending_online_order', JSON.stringify(fullPendingOrder));
          } catch (e) {
            console.error('Storage error:', e);
          }

          setClientSecret(data.clientSecret);
          setShowStripe(true);
          setIsSubmitting(false);
          return;
        } else {
          throw new Error(data.error || 'Failed to initialize payment');
        }
      }

      // If cash or card on collection/delivery
      await placeOrder();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error in checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeOrder = async (extPaymentId?: string) => {
    if (isPlacingOrderRef.current) {
      console.log('Order placement already in progress, ignoring duplicate call.');
      return;
    }

    if (!isDeliveryAvailable && orderType === 'delivery') {
      if (isCollectionAvailable) {
        toast.error('Delivery orders are currently closed. Please choose collection.');
        setOrderType('collection');
      } else {
        toast.error('Orders are currently paused.');
      }
      return;
    }

    if (!isCollectionAvailable && orderType === 'collection') {
      if (isDeliveryAvailable) {
        toast.error('Collection orders are currently closed. Please choose delivery.');
        setOrderType('delivery');
      } else {
        toast.error('Orders are currently paused.');
      }
      return;
    }

    isPlacingOrderRef.current = true;
    setIsSubmitting(true);

    try {
      const isCollection = orderType === 'collection';
      const formattedAddress = !isCollection 
        ? `${(houseNumber || '').trim() ? (houseNumber || '').trim() + ' ' : ''}${(houseName || '').trim() ? (houseName || '').trim() + '\n' : ''}${(streetName || '').trim()}\n${(areaName || '').trim()}\n${(postcode || '').trim()}`
        : '';

      let orderUser = user;
      
      if (!orderUser) {
        try {
          const cred = await signInAnonymously(auth);
          orderUser = {
            uid: cred.user.uid,
            name: (customerName || '').trim() || 'Customer',
            email: (email || '').trim() || '',
            role: 'customer'
          };
        } catch (error) {
          console.error('Guest login notice:', error);
        }
      }

      const cleanPaymentId = extPaymentId ? String(extPaymentId).trim() : null;
      const targetDocId = cleanPaymentId || `crrave_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const orderPayload = {
        restaurantId: 'crrave_leyton',
        brand: 'crrave',
        userId: orderUser?.uid || 'guest_' + (cleanPaymentId ? cleanPaymentId.slice(-8) : Date.now()),
        customerName: ((customerName || '').trim() || 'Customer'),
        email: (email || '').trim() || orderUser?.email || '',
        items: sortedCart,
        subtotal,
        discountAmount,
        discountPercentage,
        stampCardDiscount: isStampRewardEligible && useStampReward ? stampCardDiscount : 0,
        stampCardPercentage: isStampRewardEligible && useStampReward ? stampRewardPercentage : 0,
        stampCardApplied: isStampRewardEligible && useStampReward,
        deliveryFee: isCollection ? 0 : currentDeliveryFee,
        distance: isCollection ? null : distance,
        total,
        status: 'pending',
        type: orderType,
        phone: (phone || '').trim(),
        address: isCollection ? '' : formattedAddress,
        houseNumber: isCollection ? '' : (houseNumber || '').trim(),
        houseName: isCollection ? '' : (houseName || '').trim(),
        streetName: isCollection ? '' : (streetName || '').trim(),
        areaName: isCollection ? '' : (areaName || '').trim(),
        postcode: isCollection ? '' : (postcode || '').trim(),
        timeSlot: selectedTimeSlot,
        paymentMethod: cleanPaymentId ? 'pay_online' : paymentMethod,
        paymentId: cleanPaymentId || null,
        notes: (orderNotes || '').trim(),
        estimate: '',
        createdAt: serverTimestamp(),
      };

      let finalOrderId = targetDocId;

      // 1. If paid online with Stripe / Apple Pay, notify server to guarantee order record
      if (cleanPaymentId) {
        try {
          const srvResp = await fetch('/api/confirm-order-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: cleanPaymentId,
              orderData: orderPayload,
            }),
          });
          if (srvResp.ok) {
            const srvData = await srvResp.json();
            if (srvData.orderId) {
              finalOrderId = srvData.orderId;
            }
          }
        } catch (srvErr) {
          console.warn('Server order creation warning:', srvErr);
        }
      } else {
        // 1b. For cash / collection orders, record order via backend API for guaranteed persistence
        try {
          const createResp = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: finalOrderId,
              orderData: orderPayload,
            }),
          });
          if (createResp.ok) {
            const createData = await createResp.json();
            if (createData.orderId) {
              finalOrderId = createData.orderId;
            }
          }
        } catch (serverErr) {
          console.warn('Server create-order fallback warning:', serverErr);
        }
      }

      // 2. Ensure Firestore has document written with deterministic ID using setDoc with merge
      try {
        const docRef = doc(db, 'orders', finalOrderId);
        await setDoc(docRef, orderPayload, { merge: true });
      } catch (fsErr) {
        console.warn('Client Firestore write warning:', fsErr);
      }

      // 3. Update customer StampCard loyalty progress for registered members only
      if (user && !user.isGuest && user.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          if (isStampRewardEligible && useStampReward) {
            await updateDoc(userDocRef, {
              stamps: 0,
              lastOrderAt: serverTimestamp(),
            });
          } else {
            const nextStamps = Math.min(4, userStamps + 1);
            await updateDoc(userDocRef, {
              stamps: nextStamps,
              lastOrderAt: serverTimestamp(),
            });
          }
        } catch (stampErr) {
          console.warn('Notice updating customer stamp card:', stampErr);
        }
      }

      if (cleanPaymentId) {
        processedPaymentIntentsRef.current.add(cleanPaymentId);
      }

      localStorage.removeItem('crrave_pending_online_order');
      sessionStorage.removeItem('crrave_pending_online_order');
      setPlacedOrderId(finalOrderId);
      setOrderSuccess(true);

      const lastOrderData = {
        id: finalOrderId,
        items: sortedCart,
        total,
        orderType,
        customerName: (customerName || '').trim(),
        phone: (phone || '').trim(),
        postcode: (postcode || '').trim(),
        streetName: (streetName || '').trim(),
        houseNumber: (houseNumber || '').trim(),
        houseName: (houseName || '').trim(),
        areaName: (areaName || '').trim(),
        createdAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('crrave_last_order', JSON.stringify(lastOrderData));
        const existingGuestOrders = localStorage.getItem('crrave_guest_orders');
        let list = existingGuestOrders ? JSON.parse(existingGuestOrders) : [];
        list = [lastOrderData, ...list.filter((o: any) => o.id !== finalOrderId)].slice(0, 10);
        localStorage.setItem('crrave_guest_orders', JSON.stringify(list));
      } catch (e) {
        console.error('Error saving local order history:', e);
      }
      setLastOrder(lastOrderData);

      clearCart();
      setShowStripe(false);
      toast.success('Order sent to kitchen!');
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to complete order. Please try again.');
    } finally {
      setIsSubmitting(false);
      isPlacingOrderRef.current = false;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="cart-drawer-overlay">
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
          <motion.div
            key="cart-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0d0d0d] z-[70] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-orange-500" />
                <h2 className="text-xl font-bold tracking-tight">YOUR CART</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {orderSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6"
                >
                  {liveStatus === 'pending' ? (
                    <>
                      <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500">
                        <Loader2 className="animate-spin" size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold italic tracking-tighter uppercase">Waiting for Kitchen...</h3>
                        <p className="text-gray-400 text-sm">The restaurant is reviewing your order. Please stay on this screen.</p>
                      </div>
                    </>
                  ) : liveStatus === 'ready' ? (
                    <>
                      <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 animate-bounce">
                        <ShoppingBag size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-blue-500">Ready for Collection!</h3>
                        <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Head over to the restaurant now</p>
                        <p className="text-gray-500 text-xs mt-4">Please show your order ID at the counter.</p>
                      </div>
                    </>
                  ) : liveStatus === 'shipped' ? (
                    <>
                      <div className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-500/30 animate-pulse">
                        <Truck size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-purple-500">Out for Delivery!</h3>
                        <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Our driver is on the way</p>
                        <p className="text-gray-500 text-xs mt-4">Hot food arriving shortly!</p>
                      </div>
                    </>
                  ) : (liveStatus === 'delivered' || liveStatus === 'collected') ? (
                    <>
                      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-500/30">
                        <CheckCircle2 size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-green-500">
                          {liveStatus === 'collected' ? 'Collected!' : 'Enjoy your meal!'}
                        </h3>
                        <p className="text-gray-400">
                          {liveStatus === 'collected' 
                            ? 'Thank you for your visit!' 
                            : 'Order successfully completed. Thank you!'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                        <CheckCircle2 size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold italic tracking-tighter uppercase">Order Confirmed!</h3>
                        <p className="text-gray-400 font-medium">Your order has been accepted and is being prepared.</p>
                      </div>
                      
                      <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-center gap-3 text-orange-500">
                          <Clock size={24} />
                          <span className="text-sm font-bold uppercase tracking-widest">Estimated {orderType === 'delivery' ? 'Delivery' : 'Collection'}</span>
                        </div>
                        <motion.div 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-4xl font-black tracking-tighter text-orange-500"
                        >
                          {estimate}
                        </motion.div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                          {selectedTimeSlot === 'ASAP' 
                            ? "Kitchen confirmed time." 
                            : `Scheduled: ${selectedTimeSlot}`}
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setOrderSuccess(false);
                      setPlacedOrderId(null);
                      setLiveStatus('pending');
                    }}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all"
                  >
                    OKAY
                  </button>
                </motion.div>
              ) : cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6">
                  <ShoppingBag size={64} strokeWidth={1} />
                  <p className="text-lg">Your cart is empty</p>

                  {lastOrder && lastOrder.items && lastOrder.items.length > 0 && (
                    <div className="w-full bg-white/5 border border-orange-500/20 rounded-2xl p-5 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-orange-500 font-bold text-sm">
                        <RotateCcw size={16} />
                        <span>Repeat Previous Order</span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium line-clamp-2">
                        {lastOrder.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <button
                        onClick={() => onRepeatOrder && onRepeatOrder(lastOrder.items)}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
                      >
                        REORDER PREVIOUS ITEMS ({formatPrice(lastOrder.total)})
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-orange-500 font-bold hover:underline text-sm"
                  >
                    Browse Full Menu
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {sortedCart.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm">
                            {item.name}
                            {item.variant && <span className="text-orange-600 ml-1">({item.variant})</span>}
                          </h3>
                          <p className="text-orange-500 text-xs font-bold mt-1">
                            {formatPrice(item.price)}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:bg-white/10 rounded border border-white/10"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:bg-white/10 rounded border border-white/10"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col justify-between items-end">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <span className="font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/10">
                    {isCollectionAvailable && isDeliveryAvailable ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOrderType('collection');
                            setHouseNumber('');
                            setHouseName('');
                            setStreetName('');
                            setAreaName('');
                            setPostcode('');
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                            orderType === 'collection' 
                              ? "bg-orange-500/10 border-orange-500 text-orange-500" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                          )}
                        >
                          <Store size={20} />
                          <span className="text-xs font-bold">COLLECTION</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType('delivery')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                            orderType === 'delivery' 
                              ? "bg-orange-500/10 border-orange-500 text-orange-500" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                          )}
                        >
                          <Truck size={20} />
                          <span className="text-xs font-bold">DELIVERY</span>
                        </button>
                      </div>
                    ) : isCollectionAvailable && !isDeliveryAvailable ? null : !isCollectionAvailable && isDeliveryAvailable ? (
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between gap-3 text-orange-400">
                        <div className="flex items-center gap-2.5">
                          <Truck size={20} className="text-orange-500" />
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider block text-white">DELIVERY ONLY</span>
                            <span className="text-[10px] text-gray-400">Collection orders are temporarily closed.</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-[10px] font-bold text-orange-300 uppercase">
                          Delivery Active
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-3 text-red-400">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle size={20} className="text-red-500" />
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider block text-white">ORDERS TEMPORARILY PAUSED</span>
                            <span className="text-[10px] text-gray-400">Both collection and delivery are currently unavailable.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div id="cart-customer-details" className="space-y-4">
                      {user && !user.isGuest && (
                        <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow">
                              <Check size={16} strokeWidth={3} />
                            </div>
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider block text-white">
                                Ordering as {user.name || user.phone || 'Member'}
                              </span>
                              <span className="text-[10px] text-orange-300 font-bold">
                                ⭐ Member discount active
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                            Full Name <span className="text-orange-500 font-bold">*</span>
                          </label>
                          {validationErrors.name && (
                            <span className="text-[10px] text-orange-400 font-bold">{validationErrors.name}</span>
                          )}
                        </div>
                        <input
                          id="cart-customer-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            if (validationErrors.name) {
                              setValidationErrors((prev) => {
                                const next = { ...prev };
                                delete next.name;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. John Doe"
                          className={cn(
                            "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                            validationErrors.name 
                              ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                              : "border-white/10 focus:border-orange-500"
                          )}
                        />
                      </div>

                      {(!user || user.isGuest) && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                              Email Address <span className="text-orange-500 font-bold">*</span>
                            </label>
                            {validationErrors.email && (
                              <span className="text-[10px] text-orange-400 font-bold">{validationErrors.email}</span>
                            )}
                          </div>
                          <input
                            id="cart-customer-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (validationErrors.email) {
                                setValidationErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.email;
                                  return next;
                                });
                              }
                            }}
                            placeholder="e.g. john@example.com (for order receipt)"
                            className={cn(
                              "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                              validationErrors.email 
                                ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                                : "border-white/10 focus:border-orange-500"
                            )}
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                            Phone Number <span className="text-orange-500 font-bold">*</span>
                          </label>
                          {validationErrors.phone && (
                            <span className="text-[10px] text-orange-400 font-bold">{validationErrors.phone}</span>
                          )}
                        </div>
                        <input
                          id="cart-customer-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (validationErrors.phone) {
                              setValidationErrors((prev) => {
                                const next = { ...prev };
                                delete next.phone;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. 07123456789 (for order updates)"
                          className={cn(
                            "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                            validationErrors.phone 
                              ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                              : "border-white/10 focus:border-orange-500"
                          )}
                        />
                      </div>

                      {orderType === 'delivery' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                                  House No:
                                </label>
                                {validationErrors.house && (
                                  <span className="text-[10px] text-orange-400 font-bold">{validationErrors.house}</span>
                                )}
                              </div>
                              <input
                                id="cart-house-number"
                                type="text"
                                inputMode="numeric"
                                value={houseNumber}
                                onChange={(e) => {
                                  setHouseNumber(e.target.value.replace(/[^0-9]/g, ''));
                                  if (validationErrors.house) {
                                    setValidationErrors((prev) => {
                                      const next = { ...prev };
                                      delete next.house;
                                      return next;
                                    });
                                  }
                                }}
                                placeholder="e.g. 12"
                                className={cn(
                                  "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                                  validationErrors.house 
                                    ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                                    : "border-white/10 focus:border-orange-500"
                                )}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                                House Name
                              </label>
                              <input
                                id="cart-house-name"
                                type="text"
                                value={houseName}
                                onChange={(e) => {
                                  setHouseName(e.target.value);
                                  if (validationErrors.house) {
                                    setValidationErrors((prev) => {
                                      const next = { ...prev };
                                      delete next.house;
                                      return next;
                                    });
                                  }
                                }}
                                placeholder="e.g. Flat 3"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                                Street Name <span className="text-orange-500 font-bold">*</span>
                              </label>
                              {validationErrors.street && (
                                <span className="text-[10px] text-orange-400 font-bold">{validationErrors.street}</span>
                              )}
                            </div>
                            <input
                              id="cart-street-name"
                              type="text"
                              value={streetName}
                              onChange={(e) => {
                                setStreetName(e.target.value);
                                if (validationErrors.street) {
                                  setValidationErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.street;
                                    return next;
                                  });
                                }
                              }}
                              placeholder="e.g. Lea Bridge Road"
                              className={cn(
                                "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                                validationErrors.street 
                                  ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                                  : "border-white/10 focus:border-orange-500"
                              )}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                                Area Name <span className="text-orange-500 font-bold">*</span>
                              </label>
                              {validationErrors.area && (
                                <span className="text-[10px] text-orange-400 font-bold">{validationErrors.area}</span>
                              )}
                            </div>
                            <input
                              id="cart-area-name"
                              type="text"
                              value={areaName}
                              onChange={(e) => {
                                setAreaName(e.target.value);
                                if (validationErrors.area) {
                                  setValidationErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.area;
                                    return next;
                                  });
                                }
                              }}
                              placeholder="e.g. Leyton, London"
                              className={cn(
                                "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors",
                                validationErrors.area 
                                  ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                                  : "border-white/10 focus:border-orange-500"
                              )}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
                                Postcode <span className="text-orange-500 font-bold">*</span>
                              </label>
                              {validationErrors.postcode && (
                                <span className="text-[10px] text-orange-400 font-bold">{validationErrors.postcode}</span>
                              )}
                            </div>
                            <input
                              id="cart-postcode"
                              type="text"
                              value={postcode}
                              onChange={(e) => {
                                setPostcode(e.target.value.toUpperCase());
                                if (validationErrors.postcode) {
                                  setValidationErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.postcode;
                                    return next;
                                  });
                                }
                              }}
                              placeholder="e.g. E10 6AE"
                              className={cn(
                                "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors uppercase",
                                validationErrors.postcode 
                                  ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10" 
                                  : "border-white/10 focus:border-orange-500"
                              )}
                            />
                            {orderType === 'delivery' && postcode.trim().length >= 2 && !isValidAddress && (
                              <p className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1.5">
                                <AlertTriangle size={13} className="shrink-0" />
                                This postcode is out of coverage.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-black block">
                            Preferred Time Slot
                          </label>
                          {selectedTimeSlot && (
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">
                              {selectedTimeSlot === 'ASAP' ? '⚡ ASAP' : `🕒 ${selectedTimeSlot}`}
                            </span>
                          )}
                        </div>

                        {/* Closure notice if closed today */}
                        {closedStatusToday.isClosed && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 space-y-2">
                            <div className="flex items-center gap-2 text-red-400">
                              <AlertTriangle size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Restaurant Closed Today</span>
                            </div>
                            <p className="text-xs text-gray-300 font-medium">
                              {closedStatusToday.reason || "We are closed today for scheduled closure."} You can pre-order for tomorrow!
                            </p>
                          </div>
                        )}

                        {/* Standard closed banner if not open right now and not a scheduled full closure */}
                        {!isOpenNow && !closedStatusToday.isClosed && (
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-4 space-y-3">
                             <div className="flex items-center gap-2 text-orange-500">
                               <AlertTriangle size={16} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Restaurant Currently Closed</span>
                             </div>
                             <p className="text-xs text-gray-300 font-medium">
                               We are currently closed for immediate orders. You can still place a <span className="text-orange-500 font-bold">pre-order</span> {filteredTimeSlots.some(s => s !== 'ASAP' && !s.startsWith('Tomorrow')) ? 'for later today!' : 'for tomorrow!'}
                             </p>
                             <div className="pt-2 border-t border-orange-500/10">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Opening Times Today</p>
                               <div className="flex justify-between items-center bg-black/20 rounded-lg p-2">
                                  <span className="text-[10px] font-bold text-gray-400">TODAY</span>
                                  <span className="text-[10px] font-black text-white">{BUSINESS_HOURS[new Date().getDay()].open} - {BUSINESS_HOURS[new Date().getDay()].close}</span>
                               </div>
                             </div>
                          </div>
                        )}

                        {/* Time Slot Options: ASAP text/button + Schedule Order button side-by-side */}
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                          {/* ASAP Button */}
                          <button
                            type="button"
                            disabled={!isOpenNow}
                            onClick={() => {
                              setSelectedTimeSlot('ASAP');
                              setIsScheduling(false);
                            }}
                            className={cn(
                              "relative flex flex-col items-center justify-center py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer",
                              selectedTimeSlot === 'ASAP' && !isScheduling
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-lg shadow-orange-500/25 ring-2 ring-orange-500/50"
                                : !isOpenNow
                                ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-50"
                                : "bg-black/30 hover:bg-white/5 border-white/10 text-gray-300 hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
                              <Zap size={14} className={selectedTimeSlot === 'ASAP' && !isScheduling ? "text-white" : "text-orange-500"} />
                              <span>ASAP</span>
                            </div>
                            <span className={cn(
                              "text-[10px] mt-0.5",
                              selectedTimeSlot === 'ASAP' && !isScheduling ? "text-orange-100" : "text-gray-500"
                            )}>
                              {isOpenNow ? (orderType === 'collection' ? 'Ready in ~20m' : 'Delivery ~45-60m') : 'Closed Now'}
                            </span>
                          </button>

                          {/* Schedule Order Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsScheduling(true);
                              const scheduledSlots = filteredTimeSlots.filter(s => s !== 'ASAP');
                              if (selectedTimeSlot === 'ASAP' || !selectedTimeSlot) {
                                if (scheduledSlots.length > 0) {
                                  setSelectedTimeSlot(scheduledSlots[0]);
                                }
                              }
                            }}
                            className={cn(
                              "relative flex flex-col items-center justify-center py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer",
                              isScheduling || (selectedTimeSlot && selectedTimeSlot !== 'ASAP')
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-lg shadow-orange-500/25 ring-2 ring-orange-500/50"
                                : "bg-black/30 hover:bg-white/5 border-white/10 text-gray-300 hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
                              <Calendar size={14} className={isScheduling || (selectedTimeSlot && selectedTimeSlot !== 'ASAP') ? "text-white" : "text-orange-500"} />
                              <span>Schedule Order</span>
                            </div>
                            <span className={cn(
                              "text-[10px] mt-0.5",
                              isScheduling || (selectedTimeSlot && selectedTimeSlot !== 'ASAP') ? "text-orange-100 font-bold" : "text-gray-500"
                            )}>
                              {isScheduling || (selectedTimeSlot && selectedTimeSlot !== 'ASAP') ? selectedTimeSlot : 'Choose specific time'}
                            </span>
                          </button>
                        </div>

                        {/* When Scheduling is active (or restaurant closed), show the dropdown selector */}
                        {(isScheduling || !isOpenNow || (selectedTimeSlot && selectedTimeSlot !== 'ASAP')) && (
                          <div className="space-y-1.5 p-3.5 bg-black/30 border border-white/10 rounded-2xl animate-in fade-in duration-200">
                            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center justify-between">
                              <span>Choose Scheduled Time</span>
                              <span className="text-[9px] text-orange-500 font-normal">Available kitchen slots</span>
                            </label>
                            <div className="relative">
                              <select
                                value={selectedTimeSlot === 'ASAP' ? (filteredTimeSlots.find(s => s !== 'ASAP') || '') : selectedTimeSlot}
                                onChange={(e) => {
                                  setSelectedTimeSlot(e.target.value);
                                  setIsScheduling(true);
                                }}
                                className="w-full bg-[#121212] border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer pr-10"
                              >
                                {filteredTimeSlots
                                  .filter(slot => slot !== 'ASAP')
                                  .map((slot, idx) => (
                                    <option key={`${slot}-${idx}`} value={slot} className="bg-[#121212] text-white">
                                      {slot}
                                    </option>
                                  ))}
                                {filteredTimeSlots.filter(s => s !== 'ASAP').length === 0 && (
                                  <option disabled className="bg-[#121212] text-gray-500">No scheduled slots available</option>
                                )}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <Clock size={16} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 block">
                          Order Notes / Special Instructions
                        </label>
                        <textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="e.g. No mushrooms please, or gate code is 1234..."
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!orderSuccess && cart.length > 0 && (
              <div className="p-6 bg-white/5 border-t border-white/10 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Subtotal</span>
                        <span className="font-bold">{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-500">
                          <span className="font-medium">Discount ({discountPercentage}%)</span>
                          <span className="font-bold">-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      {stampCardDiscount > 0 && (
                        <div className="flex justify-between items-center text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                          <span className="font-bold flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-400" />
                            StampCard 5th Order ({stampRewardPercentage}%)
                          </span>
                          <span className="font-black text-amber-300">-{formatPrice(stampCardDiscount)}</span>
                        </div>
                      )}
                      {orderType === 'delivery' && (
                        <div className="flex justify-between items-center text-sm py-1">
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-medium">Delivery Fee</span>
                            {distance !== null && !minOrderWarning && (
                              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest italic">
                                {currentDeliveryFee === 0 && deliveryFee > 0 ? (
                                  <span className="text-green-500 animate-pulse">FREE DELIVERY APPLIED!</span>
                                ) : distance === 0 ? (
                                  'Local Area Fee'
                                ) : (
                                  'Postcode specific fee'
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={cn("font-bold", currentDeliveryFee === 0 && deliveryFee > 0 && "text-green-500 line-through")}>
                              {formatPrice(deliveryFee)}
                            </span>
                            {currentDeliveryFee === 0 && deliveryFee > 0 && (
                              <span className="text-green-500 font-black text-[10px]">£0.00</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Promos/Warnings */}
                      {paymentMethod === 'cash' && discountSettings?.cashDiscount?.enabled && subtotal >= discountSettings.cashDiscount.minOrder && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400">
                          <Tag size={14} className="text-green-500 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest leading-normal">
                            Cash payment {discountSettings.cashDiscount.percentage}% discount applied!
                          </span>
                        </div>
                      )}

                      {paymentMethod === 'cash' && discountSettings?.cashDiscount?.enabled && subtotal < discountSettings.cashDiscount.minOrder && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-2 text-orange-400">
                          <Tag size={14} className="text-orange-500 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest leading-normal">
                            Pay cash and spend {formatPrice(discountSettings.cashDiscount.minOrder - subtotal)} more for {discountSettings.cashDiscount.percentage}% cash discount!
                          </span>
                        </div>
                      )}

                      {paymentMethod === 'pay_online' && total < 0.30 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500"
                        >
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Min. Online Payment is £0.30</span>
                        </motion.div>
                      )}

                      {orderType === 'delivery' && postcode.trim().length >= 2 && !isValidAddress && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500"
                        >
                          <AlertTriangle size={14} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            This postcode is out of coverage.
                          </span>
                        </motion.div>
                      )}
                      
                      {minOrderWarning ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500"
                        >
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{minOrderWarning}</span>
                        </motion.div>
                      ) : (
                        isDeliveryAvailable && orderType === 'delivery' && discountSettings?.freeDeliveryEnabled && subtotal < discountSettings.freeDeliveryMinOrder && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-2 text-blue-400">
                            <div className="flex items-center gap-2">
                              <Truck size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Spend {formatPrice(discountSettings.freeDeliveryMinOrder - subtotal)} more for free delivery</span>
                            </div>
                          </div>
                        )
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-gray-400 font-medium">Total</span>
                        <span className="text-2xl font-black text-orange-500">{formatPrice(total)}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={isSubmitting || !discountSettings || (!isCollectionAvailable && !isDeliveryAvailable) || (orderType === 'collection' && !isCollectionAvailable) || (orderType === 'delivery' && (!isDeliveryAvailable || !isValidAddress)) || !!minOrderWarning || (!isOpenNow && selectedTimeSlot === 'ASAP') || selectedTimeSlot === ''}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                        (isSubmitting || !discountSettings || (!isCollectionAvailable && !isDeliveryAvailable) || (orderType === 'collection' && !isCollectionAvailable) || (orderType === 'delivery' && (!isDeliveryAvailable || !isValidAddress)) || !!minOrderWarning || (!isOpenNow && selectedTimeSlot === 'ASAP') || selectedTimeSlot === '')
                          ? "bg-white/5 text-gray-500 cursor-not-allowed"
                          : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20"
                      )}
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : !discountSettings ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          LOADING...
                        </>
                      ) : (!isCollectionAvailable && !isDeliveryAvailable) ? (
                        <>
                          <AlertTriangle size={20} />
                          ORDERS PAUSED
                        </>
                      ) : (orderType === 'collection' && !isCollectionAvailable) ? (
                        <>
                          <AlertTriangle size={20} />
                          COLLECTION CLOSED
                        </>
                      ) : (orderType === 'delivery' && !isDeliveryAvailable) ? (
                        <>
                          <AlertTriangle size={20} />
                          DELIVERY CLOSED
                        </>
                      ) : minOrderWarning ? (
                        <>
                          <AlertTriangle size={20} />
                          BELOW MINIMUM
                        </>
                      ) : (!isOpenNow && selectedTimeSlot === 'ASAP') ? (
                        <>
                          <Clock size={20} />
                          SELECT TIME SLOT
                        </>
                      ) : selectedTimeSlot === '' ? (
                        <>
                          <Clock size={20} />
                          SELECT TIME
                        </>
                      ) : (!user && !customerName.trim() && !phone.trim()) ? (
                        <>
                          <User size={20} />
                          CHOOSE GUEST OR SIGN IN TO ORDER
                        </>
                      ) : (!customerName.trim() || !phone.trim()) ? (
                        <>
                          <User size={20} />
                          ENTER DETAILS TO ORDER
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} />
                          PROCEED TO PAYMENT • {formatPrice(total)}
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
                      Secure checkout powered by Stripe
                    </p>
                  </div>
                )}
            </motion.div>
        </div>
      )}

      {showPaymentModal && (
        <motion.div
          key="payment-method-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (!isSubmitting) setShowPaymentModal(false);
          }}
        >
          <motion.div
            key="payment-method-modal-dialog"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0f0f0f] border border-orange-500/20 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block">Checkout Step 2 of 2</span>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white">Select Payment Method</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
                className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {showStripe && clientSecret && (stripePublishableKey || discountSettings?.stripePublishableKey) ? (
              <div className="py-2 space-y-4">
                <p className="text-xs text-gray-400 font-bold">Complete your online payment with Stripe:</p>
                <PaymentErrorBoundary
                  onFallbackToCash={() => {
                    setShowStripe(false);
                    setPaymentMethod(orderType === 'collection' ? 'card_on_collection' : 'cash');
                  }}
                  onCancel={() => setShowStripe(false)}
                >
                  {activeStripePromise ? (
                    <Elements stripe={activeStripePromise} options={stripeElementsOptions}>
                      <CheckoutForm 
                        amount={total} 
                        customerName={customerName}
                        onSuccess={(id) => {
                          setShowPaymentModal(false);
                          placeOrder(id);
                        }} 
                        onCancel={() => {
                          setShowStripe(false);
                          localStorage.removeItem('crrave_pending_online_order');
                          sessionStorage.removeItem('crrave_pending_online_order');
                        }} 
                      />
                    </Elements>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-orange-500 space-y-3">
                      <Loader2 className="animate-spin" size={32} />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading Stripe Payments...</span>
                    </div>
                  )}
                </PaymentErrorBoundary>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Choose payment option for your {orderType}:</p>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Pay Online */}
                    <button
                      key="payment-option-online"
                      type="button"
                      onClick={() => setPaymentMethod('pay_online')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer",
                        paymentMethod === 'pay_online'
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-500">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-black block text-white">Pay Online</span>
                          <span className="text-[11px] text-gray-400 font-medium">Cards, Apple Pay, Google Pay</span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        paymentMethod === 'pay_online' ? "border-orange-500 bg-orange-500" : "border-gray-500"
                      )}>
                        {paymentMethod === 'pay_online' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>

                    {/* Cash Option */}
                    {(!discountSettings || discountSettings.allowCashOrders !== false) && (
                      <button
                        key="payment-option-cash"
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer",
                          paymentMethod === 'cash'
                            ? "bg-orange-500/15 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                            <Banknote size={20} />
                          </div>
                          <div>
                            <span className="text-sm font-black block text-white">
                              Cash {orderType === 'collection' ? 'on Collection' : 'on Delivery'}
                            </span>
                            {discountSettings?.cashDiscount?.enabled && subtotal >= discountSettings.cashDiscount.minOrder ? (
                              <span className="text-[11px] text-green-400 font-bold">
                                {discountSettings.cashDiscount.percentage}% Cash Discount Applied!
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-medium">Pay cash upon {orderType}</span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          paymentMethod === 'cash' ? "border-orange-500 bg-orange-500" : "border-gray-500"
                        )}>
                          {paymentMethod === 'cash' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </button>
                    )}

                    {/* Card on Collection / Delivery */}
                    <button
                      key="payment-option-card"
                      type="button"
                      onClick={() => setPaymentMethod('card_on_collection')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer",
                        paymentMethod === 'card_on_collection'
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-black block text-white">
                            Card {orderType === 'collection' ? 'on Collection' : 'on Delivery'}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">Pay via card terminal upon {orderType}</span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        paymentMethod === 'card_on_collection' ? "border-orange-500 bg-orange-500" : "border-gray-500"
                      )}>
                        {paymentMethod === 'card_on_collection' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-400 font-bold">
                      <span>Discount ({discountPercentage}%)</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {orderType === 'delivery' && (
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Delivery Fee</span>
                      <span>{currentDeliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-bold">
                    <span className="text-white">Total Amount</span>
                    <span className="text-xl font-black text-orange-500">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmPaymentMethod}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        CONFIRM & PLACE ORDER ({formatPrice(total)})
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmitting}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Back to details
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Sign-In vs Guest Mode Choice Modal */}
      {showAuthOrGuestModal && (
        <motion.div
          key="auth-or-guest-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAuthOrGuestModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#121212] border border-orange-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block">
                  Welcome to Crrave Leyton
                </span>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                  How Would You Like to Order?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthOrGuestModal(false)}
                className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Continue as Guest */}
              <button
                type="button"
                onClick={() => {
                  setShowAuthOrGuestModal(false);
                  const detailsEl = document.getElementById('cart-customer-details');
                  if (detailsEl) {
                    detailsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  setTimeout(() => {
                    document.getElementById('cart-customer-name')?.focus();
                  }, 300);
                }}
                className="w-full p-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-orange-600/30 group"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="p-2.5 rounded-xl bg-black/30 text-white">
                    <Zap size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-black uppercase tracking-wider block">
                      Order as Guest
                    </span>
                    <span className="text-xs text-orange-100 font-medium">
                      Fast checkout, no account or password needed
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Option 2: Sign In / Create Account */}
              <button
                type="button"
                onClick={() => {
                  setShowAuthOrGuestModal(false);
                  if (setAuthModalOpen) setAuthModalOpen(true);
                }}
                className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-black uppercase tracking-wider block text-white">
                      Sign In with Phone
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Collect stamps & unlock 10% OFF reward
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Guest orders receive email receipts and real-time live kitchen tracking!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
