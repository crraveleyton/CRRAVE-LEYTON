import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, orderBy, doc, onSnapshot } from '../firebase';
import { UserProfile } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, AlertTriangle, ChevronDown, ChevronUp, ArrowUp, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, cn } from '../lib/utils';
import { isOpenNow } from '../lib/businessHours';
import { SmashBurgerModal } from './SmashBurgerModal';
import { GrillsPeriPeriModal } from './GrillsPeriPeriModal';
import { GeneralItemCustomizerModal } from './GeneralItemCustomizerModal';
import { MunchBoxModal } from './MunchBoxModal';
import { ToastedSandwichModal } from './ToastedSandwichModal';
import { WrapModal } from './WrapModal';
import { CrraveBoxModal } from './CrraveBoxModal';
import {
  CRRAVE_CATEGORIES,
  CRRAVE_MENU_ITEMS,
  SOFT_DRINK_CHOICES,
  PERI_PERI_FLAVOURS,
  WINGS_FLAVOURS,
  STRIPS_FLAVOURS,
  WRAP_SAUCE_OPTIONS,
  ALL_BURGER_NAMES,
  CrraveMenuItemData,
} from '../data/crraveMenuData';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  order: number;
  image?: string;
  heroImage?: string;
  customizationType?: CrraveMenuItemData['customizationType'];
}

interface MenuProps {
  user: UserProfile | null;
  addToCart: (item: { id: string; name: string; price: number; variant?: string }) => void;
  editDish?: (id: string) => void;
}

// Global memory cache initialized with the official CRRAVE Leyton menu
let cachedMenuItems: MenuItem[] = CRRAVE_MENU_ITEMS;
let cachedCategories: string[] = CRRAVE_CATEGORIES.map((c) => c.name);

export default function Menu({ user, addToCart, editDish }: MenuProps) {
  const [items, setItems] = useState<MenuItem[]>(() => cachedMenuItems);
  const [categories, setCategories] = useState<string[]>(() => cachedCategories);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountSettings, setDiscountSettings] = useState<any>(null);
  const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(isOpenNow());
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    'SMASH BURGERS': true,
    'CHICKEN BURGERS': true,
    'GRILLS & PERI PERI': true,
  });
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Dedicated Smash & Chicken Burger Customizer state
  const [smashModalItem, setSmashModalItem] = useState<MenuItem | null>(null);
  // Dedicated Grills & Peri Peri Customizer state
  const [grillModalItem, setGrillModalItem] = useState<MenuItem | null>(null);
  // Dedicated Munch Box Customizer state (exact system from screenshots)
  const [munchBoxModalItem, setMunchBoxModalItem] = useState<MenuItem | null>(null);
  // Dedicated Toasted Sandwich Customizer state
  const [toastedSandwichModalItem, setToastedSandwichModalItem] = useState<MenuItem | null>(null);
  // Dedicated Wrap Customizer state (all wrap category items)
  const [wrapModalItem, setWrapModalItem] = useState<MenuItem | null>(null);
  // Dedicated Crrave Box Customizer state (exact setup from screenshots)
  const [crraveBoxModalItem, setCrraveBoxModalItem] = useState<MenuItem | null>(null);
  // Dedicated General Items Customizer state (for all other categories)
  const [generalModalItem, setGeneralModalItem] = useState<MenuItem | null>(null);

  // Customization modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<'Regular' | 'Large'>('Regular');
  const [selectedMealOption, setSelectedMealOption] = useState<'burger-only' | 'meal'>('burger-only');
  const [selectedDrink, setSelectedDrink] = useState<string>('Cola');
  const [selectedPeriFlavour, setSelectedPeriFlavour] = useState<string>('Mild');
  const [selectedSideUpgrade, setSelectedSideUpgrade] = useState<'none' | 'rice' | 'fries'>('none');
  const [selectedWingFlavour, setSelectedWingFlavour] = useState<string>('Spicy');
  const [selectedStripFlavour, setSelectedStripFlavour] = useState<string>('Normal');
  const [selectedDonerSide, setSelectedDonerSide] = useState<'Spicy Rice' | 'Skin On Fries'>('Spicy Rice');
  const [selectedSandwichMeat, setSelectedSandwichMeat] = useState<'Chicken' | 'Beef'>('Chicken');
  const [selectedDonerMeat, setSelectedDonerMeat] = useState<'Chicken Doner' | 'Meat Doner'>('Chicken Doner');
  const [selectedWrapSauce, setSelectedWrapSauce] = useState<string>('House Sauce');
  const [selectedLoadedBase, setSelectedLoadedBase] = useState<'Skin On Fries' | 'Potato Tots'>('Skin On Fries');
  const [selectedLoadedMeat, setSelectedLoadedMeat] = useState<'Grilled Chicken' | 'Beef' | 'Crispy Chicken'>('Grilled Chicken');
  const [selectedCheeseBase, setSelectedCheeseBase] = useState<'Skin On Fries' | 'Potato Tots'>('Skin On Fries');
  const [selectedKidsMain, setSelectedKidsMain] = useState<'4 Nuggets' | 'Mini Cheeseburger' | 'Mini Chicken Burger'>('4 Nuggets');
  const [selectedMunchBurger, setSelectedMunchBurger] = useState<'Chicken Burger' | 'Beef Burger'>('Chicken Burger');
  const [selectedCrraveBurger, setSelectedCrraveBurger] = useState<string>('Cheeseburger');

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'crrave_receipt'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDiscountSettings(data);
        if (data.businessHours) {
          setIsCurrentlyOpen(isOpenNow(data.businessHours, data.closedDates));
        } else {
          setIsCurrentlyOpen(isOpenNow(undefined, data.closedDates));
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (discountSettings?.businessHours) {
        setIsCurrentlyOpen(isOpenNow(discountSettings.businessHours, discountSettings?.closedDates));
      } else {
        setIsCurrentlyOpen(isOpenNow(undefined, discountSettings?.closedDates));
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [discountSettings]);

  // Real-time synchronization with dedicated Crrave Leyton Firebase database
  useEffect(() => {
    const unsubItems = onSnapshot(
      query(collection(db, 'menu'), orderBy('order', 'asc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedItems = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            order: d.data().order ?? 0,
          })) as MenuItem[];
          const availItems = fetchedItems.filter((i) => i.available !== false);
          setItems(availItems);
        }
      },
      () => {
        setItems(CRRAVE_MENU_ITEMS);
      }
    );

    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), orderBy('order', 'asc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedCats = snapshot.docs.map((d) => d.data().name as string);
          setCategories(fetchedCats);
        }
      },
      () => {
        setCategories(CRRAVE_CATEGORIES.map((c) => c.name));
      }
    );

    return () => {
      unsubItems();
      unsubCats();
    };
  }, []);

  const handleSmashAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleGrillAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleMunchBoxAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleToastedSandwichAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleWrapAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleCrraveBoxAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleGeneralAddToCart = (customized: {
    id: string;
    name: string;
    price: number;
    variant?: string;
    quantity: number;
  }) => {
    for (let i = 0; i < customized.quantity; i++) {
      addToCart({
        id: `${customized.id}_${Date.now()}_${i}`,
        name: customized.name,
        price: customized.price,
        variant: customized.variant,
      });
    }
    toast.success(`Added ${customized.quantity}x ${customized.name} to basket!`);
  };

  const handleAddToCart = (item: MenuItem) => {
    // 1. Munch Box (exactly matching user screenshots: Donner -> Burger -> Drink -> Extras -> Summary & Quantity)
    if (
      item.name.toLowerCase().includes('munch box') ||
      item.id === 'deal-munch-box' ||
      item.customizationType === 'munch-box'
    ) {
      setMunchBoxModalItem(item);
      return;
    }

    // 2. CRRAVE Box (exact setup from screenshots: 12 Burgers -> Extras up to 3 -> Drink -> Summary & Basket)
    if (
      item.name.toLowerCase().includes('crrave box') ||
      item.id === 'deal-crrave-box' ||
      item.customizationType === 'crrave-box'
    ) {
      setCrraveBoxModalItem(item);
      return;
    }

    // 3. Special Rice Box (no selection needed, show only add to cart like the end of every dish adding)
    if (
      item.category === 'SPECIAL RICE BOX' ||
      item.name.toLowerCase().includes('special rice') ||
      item.name.toLowerCase().includes('rice box')
    ) {
      setGeneralModalItem(item);
      return;
    }

    // 4. Toasted Sandwiches (Chicken / Beef (two patties) -> Single / Add Fries £2.00 / Add Spicy Rice £2.00 -> Summary)
    if (
      item.category === 'TOASTED SANDWICHES' ||
      item.customizationType === 'toasted-sandwich'
    ) {
      setToastedSandwichModalItem(item);
      return;
    }

    // 5. Wraps (All wrap category items: Make it a Meal (+£3.50) / Single -> Choice of Sauces up to 8 (+£0.30) -> Drink (if meal) -> Summary & Basket)
    if (
      item.category === 'WRAPS' ||
      item.customizationType === 'wrap-sauce' ||
      item.customizationType === 'wrap-doner' ||
      item.name.toLowerCase().includes('wrap')
    ) {
      setWrapModalItem(item);
      return;
    }

    // 6. Smash Burgers & Chicken Burgers (same design and functionality, chicken burgers without picture)
    if (
      item.category === 'SMASH BURGERS' ||
      item.category === 'CHICKEN BURGERS' ||
      item.customizationType === 'smash-burger' ||
      item.customizationType === 'chicken-burger-meal'
    ) {
      setSmashModalItem(item);
      return;
    }

    // 7. Grills & Peri Peri (including Chicken & Lamb Doner with extra Normal/Spicy step)
    if (
      (item.category === 'GRILLS & PERI PERI' ||
      item.customizationType === 'peri-peri-chicken' ||
      item.customizationType === 'peri-peri-rice' ||
      item.customizationType === 'wings-flavour' ||
      item.customizationType === 'strips-flavour' ||
      item.customizationType === 'doner-side') &&
      item.category !== 'SPECIAL RICE BOX' &&
      !item.name.toLowerCase().includes('rice box')
    ) {
      setGrillModalItem(item);
      return;
    }

    // 8. ALL OTHER CATEGORIES: Show options customizer with summary and quantity pill
    setGeneralModalItem(item);
  };

  const calculateCustomizedPrice = () => {
    if (!customizingItem) return 0;
    let price = customizingItem.price;

    if (customizingItem.customizationType === 'chicken-burger-meal') {
      if (selectedMealOption === 'meal') price += 2.0;
    } else if (
      customizingItem.customizationType === 'shake-size' ||
      customizingItem.customizationType === 'mojito-size'
    ) {
      price = selectedSize === 'Large' ? 4.5 : 3.95;
    } else if (
      customizingItem.customizationType === 'peri-peri-chicken' ||
      customizingItem.customizationType === 'wings-flavour' ||
      customizingItem.customizationType === 'strips-flavour' ||
      customizingItem.customizationType === 'toasted-sandwich'
    ) {
      if (selectedSideUpgrade !== 'none') price += 2.0;
    }

    return price;
  };

  const confirmCustomizationAndAdd = () => {
    if (!customizingItem) return;

    let finalPrice = customizingItem.price;
    const variantParts: string[] = [];

    switch (customizingItem.customizationType) {
      case 'chicken-burger-meal':
        if (selectedMealOption === 'meal') {
          finalPrice += 2.0;
          variantParts.push(`Meal (Fries & ${selectedDrink})`);
        } else {
          variantParts.push('Burger Only');
        }
        break;

      case 'shake-size':
      case 'mojito-size':
        if (selectedSize === 'Large') {
          finalPrice = 4.5;
          variantParts.push('Large');
        } else {
          finalPrice = 3.95;
          variantParts.push('Regular');
        }
        break;

      case 'peri-peri-chicken':
        variantParts.push(selectedPeriFlavour);
        if (selectedSideUpgrade === 'rice') {
          finalPrice += 2.0;
          variantParts.push('With Spicy Rice');
        } else if (selectedSideUpgrade === 'fries') {
          finalPrice += 2.0;
          variantParts.push('With Skin-On Fries');
        }
        break;

      case 'peri-peri-rice':
        variantParts.push(selectedPeriFlavour);
        break;

      case 'wings-flavour':
        variantParts.push(selectedWingFlavour);
        if (selectedSideUpgrade === 'rice') {
          finalPrice += 2.0;
          variantParts.push('With Spicy Rice');
        } else if (selectedSideUpgrade === 'fries') {
          finalPrice += 2.0;
          variantParts.push('With Skin-On Fries');
        }
        break;

      case 'strips-flavour':
        variantParts.push(selectedStripFlavour);
        if (selectedSideUpgrade === 'rice') {
          finalPrice += 2.0;
          variantParts.push('With Spicy Rice');
        } else if (selectedSideUpgrade === 'fries') {
          finalPrice += 2.0;
          variantParts.push('With Skin-On Fries');
        }
        break;

      case 'doner-side':
        variantParts.push(`With ${selectedDonerSide}`);
        break;

      case 'toasted-sandwich':
        variantParts.push(selectedSandwichMeat);
        if (selectedSideUpgrade === 'rice') {
          finalPrice += 2.0;
          variantParts.push('With Spicy Rice');
        } else if (selectedSideUpgrade === 'fries') {
          finalPrice += 2.0;
          variantParts.push('With Skin-On Fries');
        }
        break;

      case 'wrap-doner':
        variantParts.push(selectedDonerMeat);
        variantParts.push(selectedWrapSauce);
        break;

      case 'wrap-sauce':
        variantParts.push(selectedWrapSauce);
        break;

      case 'loaded-fries':
        variantParts.push(`${selectedLoadedBase} • ${selectedLoadedMeat}`);
        break;

      case 'cheese-fries-tots':
        variantParts.push(selectedCheeseBase);
        break;

      case 'kids-meal':
        variantParts.push(`${selectedKidsMain} • Fries & ${selectedDrink}`);
        break;

      case 'munch-box':
        variantParts.push(`${selectedMunchBurger} • ${selectedDrink}`);
        break;

      case 'crrave-box':
        variantParts.push(`${selectedCrraveBurger} • ${selectedDrink}`);
        break;

      case 'family-platter':
        variantParts.push('Family Platter Feast');
        break;
    }

    const variantStr = variantParts.join(' • ');
    addToCart({
      id: `${customizingItem.id}-${variantStr.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      name: customizingItem.name,
      price: finalPrice,
      variant: variantStr || undefined,
    });

    setCustomizingItem(null);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const itemsByCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = filteredItems.filter((item) => item.category === cat);
      return acc;
    }, {} as { [key: string]: MenuItem[] });
  }, [categories, filteredItems]);

  const visibleCategories = useMemo(() => {
    return categories.filter((cat) => itemsByCategory[cat] && itemsByCategory[cat].length > 0);
  }, [categories, itemsByCategory]);

  return (
    <div className="relative min-h-screen text-white selection:bg-orange-500 selection:text-white">
      {/* Back to Top Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showBackToTop ? 1 : 0 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-24 right-8 z-[60] w-14 h-14 bg-orange-600/90 hover:bg-orange-600 text-white rounded-full flex flex-col items-center justify-center shadow-2xl backdrop-blur-sm cursor-pointer transition-all hover:scale-105"
      >
        <span className="text-[10px] font-bold">TOP</span>
        <ArrowUp size={16} />
      </motion.button>

      <div className="relative z-20">
        {!isCurrentlyOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-4 md:px-0 pt-6"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-red-500 mb-2">
                <AlertTriangle size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Restaurant Currently Closed</span>
              </div>
              <p className="text-gray-300 text-sm">
                We are currently closed for immediate orders. You can still pre-order for scheduled collection or delivery!
              </p>
            </div>
          </motion.div>
        )}

        {/* Info Header Area */}
        <div className="max-w-4xl mx-auto px-4 md:px-0 py-6 text-center space-y-3">
          {discountSettings && (
            <div className="text-sm font-bold space-y-1">
              {discountSettings.deliveryDiscount?.enabled && (
                <p className="text-orange-500">
                  {discountSettings.deliveryDiscount.percentage}% OFF on Delivery orders over {formatPrice(discountSettings.deliveryDiscount.minOrder)}
                </p>
              )}
              {discountSettings.collectionDiscount?.enabled && (
                <p className="text-orange-500">
                  {discountSettings.collectionDiscount.percentage}% OFF on Collection over {formatPrice(discountSettings.collectionDiscount.minOrder)}
                </p>
              )}
              {discountSettings.freeDeliveryEnabled && (
                <p className="text-green-500">
                  FREE Delivery on orders over {formatPrice(discountSettings.freeDeliveryMinOrder)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sticky Header with Search */}
        <div className="sticky top-[73px] z-40 bg-[#0d0d0d]/90 backdrop-blur-md py-4 border-b border-white/5 shadow-2xl">
          <div className="max-w-4xl mx-auto px-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search burgers, grills, wraps, shakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all placeholder:text-gray-500 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category & Dishes List */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 overflow-hidden">
          {visibleCategories.map((cat) => (
            <div
              key={cat}
              data-category={cat}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'w-full px-6 py-4 flex items-center justify-between text-left transition-colors cursor-pointer',
                  expandedCategories[cat] ? 'border-b border-white/5 bg-white/5' : 'hover:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center gap-3">
                  <h2 className="font-black text-white text-lg tracking-tight uppercase">{cat}</h2>
                  <span className="text-[11px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                    {itemsByCategory[cat]?.length || 0}
                  </span>
                </div>
                {expandedCategories[cat] ? (
                  <ChevronUp className="text-gray-400" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400" size={20} />
                )}
              </button>

              <AnimatePresence initial={false}>
                {(expandedCategories[cat] || searchQuery) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5">
                      {itemsByCategory[cat].map((item) => {
                        const hasCustomImage = !!item.image;
                        const fallbackImage =
                          cat === 'SMASH BURGERS'
                            ? '/assets/burgers/cheeseburger.jpg'
                            : cat === 'GRILLS & PERI PERI'
                            ? '/assets/grills/peri_chicken_quarter.jpg'
                            : (item.name.toLowerCase().includes('munch box') || item.id === 'deal-munch-box')
                            ? '/assets/burgers/munchbox.jpg'
                            : (cat === 'WRAPS' || item.name.toLowerCase().includes('wrap'))
                            ? '/assets/wraps/wrap.jpg'
                            : null;
                        const imageToShow = cat !== 'CHICKEN BURGERS' ? (item.image || fallbackImage) : null;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleAddToCart(item)}
                            className={cn(
                              'bg-[#0d0d0d] border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-4 sm:p-5 flex justify-between gap-4 relative group cursor-pointer transition-all duration-200 hover:bg-[#141414] shadow-md',
                              !imageToShow && 'items-center',
                              !item.available && 'opacity-60 cursor-not-allowed'
                            )}
                          >
                            {/* Left Text Column */}
                            <div className="flex-1 flex flex-col justify-between min-w-0 pr-2">
                              <div>
                                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#f5a623] transition-colors leading-tight">
                                  {item.name}
                                </h3>
                                {item.description && (
                                  <p className="text-zinc-400 text-xs sm:text-sm line-clamp-2 mt-1.5 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 pt-1 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">
                                    FROM
                                  </span>
                                  <div className="text-white font-bold text-base flex items-center gap-1 group-hover:text-[#f5a623] transition-colors">
                                    {formatPrice(item.price)}
                                    <span className="text-zinc-500 text-sm font-normal">&gt;</span>
                                  </div>
                                </div>

                                {user?.role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      editDish?.(item.id);
                                    }}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider underline cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Right Column: Image (except for CHICKEN BURGERS) & Floating Plus Button */}
                            <div
                              className={cn(
                                'relative shrink-0 flex flex-col justify-between items-end',
                                !imageToShow && 'justify-end self-end'
                              )}
                            >
                              {imageToShow && (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-md">
                                  <img
                                    src={imageToShow}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}

                              {item.available ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f5a623] hover:bg-[#e0961b] text-black flex items-center justify-center font-black text-xl shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer mt-2"
                                  aria-label={`Customize ${item.name}`}
                                >
                                  +
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded mt-2">
                                  Sold Out
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {visibleCategories.length === 0 && searchQuery && (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-gray-400 font-bold mb-4">No dishes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-orange-500 font-bold underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#141414] border border-orange-500/30 rounded-[2rem] p-6 sm:p-8 z-[101] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block">
                    {customizingItem.category}
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                    {customizingItem.name}
                  </h3>
                  <p className="text-xl font-bold text-white mt-1">
                    Total: <span className="text-orange-400">{formatPrice(calculateCustomizedPrice())}</span>
                  </p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Dynamic Option Sections */}
              <div className="space-y-6">
                {/* 1. Chicken Burgers: Burger Only vs Meal */}
                {customizingItem.customizationType === 'chicken-burger-meal' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Select Meal Option
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMealOption('burger-only')}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                            selectedMealOption === 'burger-only'
                              ? 'bg-orange-600/20 border-orange-500 text-white'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          )}
                        >
                          <span className="font-bold text-sm">Burger Only</span>
                          <span className="text-xs text-gray-400 mt-1">+£0.00</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMealOption('meal')}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                            selectedMealOption === 'meal'
                              ? 'bg-orange-600/20 border-orange-500 text-white'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          )}
                        >
                          <span className="font-bold text-sm">Make It A Meal</span>
                          <span className="text-xs text-orange-400 font-bold mt-1">+£2.00 (Fries & Drink)</span>
                        </button>
                      </div>
                    </div>

                    {selectedMealOption === 'meal' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                          Choose Included Can of Drink
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SOFT_DRINK_CHOICES.map((drink) => (
                            <button
                              key={drink}
                              type="button"
                              onClick={() => setSelectedDrink(drink)}
                              className={cn(
                                'py-2.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                                selectedDrink === drink
                                  ? 'bg-orange-600 text-white border-orange-500'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                              )}
                            >
                              {drink}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2. Shakes & Mojitos: Size Selection */}
                {(customizingItem.customizationType === 'shake-size' ||
                  customizingItem.customizationType === 'mojito-size') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Size
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSize('Regular')}
                        className={cn(
                          'p-4 rounded-xl border text-center transition-all cursor-pointer',
                          selectedSize === 'Regular'
                            ? 'bg-orange-600/20 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        )}
                      >
                        <span className="font-bold text-sm block">Regular</span>
                        <span className="text-xs text-orange-400 font-bold block mt-1">£3.95</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSize('Large')}
                        className={cn(
                          'p-4 rounded-xl border text-center transition-all cursor-pointer',
                          selectedSize === 'Large'
                            ? 'bg-orange-600/20 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        )}
                      >
                        <span className="font-bold text-sm block">Large</span>
                        <span className="text-xs text-orange-400 font-bold block mt-1">£4.50</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Peri Peri Chicken & Special Rice: Peri Peri Flavour */}
                {(customizingItem.customizationType === 'peri-peri-chicken' ||
                  customizingItem.customizationType === 'peri-peri-rice') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Peri Peri Flavour
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERI_PERI_FLAVOURS.map((flavour) => (
                        <button
                          key={flavour}
                          type="button"
                          onClick={() => setSelectedPeriFlavour(flavour)}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedPeriFlavour === flavour
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          {flavour}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Wings Flavour */}
                {customizingItem.customizationType === 'wings-flavour' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Wings Flavour
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {WINGS_FLAVOURS.map((flavour) => (
                        <button
                          key={flavour}
                          type="button"
                          onClick={() => setSelectedWingFlavour(flavour)}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedWingFlavour === flavour
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          {flavour}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Strips Flavour */}
                {customizingItem.customizationType === 'strips-flavour' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Strips Flavour
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {STRIPS_FLAVOURS.map((flavour) => (
                        <button
                          key={flavour}
                          type="button"
                          onClick={() => setSelectedStripFlavour(flavour)}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedStripFlavour === flavour
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          {flavour}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side Upgrades (+£2.00) for Grills, Wings, Strips, and Toasted Sandwiches */}
                {(customizingItem.customizationType === 'peri-peri-chicken' ||
                  customizingItem.customizationType === 'wings-flavour' ||
                  customizingItem.customizationType === 'strips-flavour' ||
                  customizingItem.customizationType === 'toasted-sandwich') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Optional Side Upgrade
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSideUpgrade('none')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedSideUpgrade === 'none'
                            ? 'bg-orange-600/30 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        )}
                      >
                        None (+£0.00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSideUpgrade('rice')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedSideUpgrade === 'rice'
                            ? 'bg-orange-600/30 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        )}
                      >
                        Spicy Rice (+£2.00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSideUpgrade('fries')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedSideUpgrade === 'fries'
                            ? 'bg-orange-600/30 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        )}
                      >
                        Fries (+£2.00)
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Doner Side Choice */}
                {customizingItem.customizationType === 'doner-side' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Side (Included)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDonerSide('Spicy Rice')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedDonerSide === 'Spicy Rice'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Spicy Rice
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDonerSide('Skin On Fries')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedDonerSide === 'Skin On Fries'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Skin On Fries
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. Toasted Sandwiches Meat Choice */}
                {customizingItem.customizationType === 'toasted-sandwich' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Meat Option
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSandwichMeat('Chicken')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedSandwichMeat === 'Chicken'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Chicken
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSandwichMeat('Beef')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedSandwichMeat === 'Beef'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Beef
                      </button>
                    </div>
                  </div>
                )}

                {/* 8. Wraps */}
                {customizingItem.customizationType === 'wrap-doner' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Doner Meat
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDonerMeat('Chicken Doner')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedDonerMeat === 'Chicken Doner'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Chicken Doner
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDonerMeat('Meat Doner')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedDonerMeat === 'Meat Doner'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Meat Doner
                      </button>
                    </div>
                  </div>
                )}

                {(customizingItem.customizationType === 'wrap-doner' ||
                  customizingItem.customizationType === 'wrap-sauce') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Sauce
                      </label>
                      <span className="text-[10px] text-gray-400">Mixed salad included</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {WRAP_SAUCE_OPTIONS.map((sauce) => (
                        <button
                          key={sauce}
                          type="button"
                          onClick={() => setSelectedWrapSauce(sauce)}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedWrapSauce === sauce
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          {sauce}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. Loaded Fries / Tots */}
                {customizingItem.customizationType === 'loaded-fries' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Base
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLoadedBase('Skin On Fries')}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedLoadedBase === 'Skin On Fries'
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          Skin On Fries
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLoadedBase('Potato Tots')}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedLoadedBase === 'Potato Tots'
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          Potato Tots
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Meat Topping
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Grilled Chicken', 'Beef', 'Crispy Chicken'] as const).map((meat) => (
                          <button
                            key={meat}
                            type="button"
                            onClick={() => setSelectedLoadedMeat(meat)}
                            className={cn(
                              'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                              selectedLoadedMeat === meat
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {meat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 10. Cheese Fries / Tots */}
                {customizingItem.customizationType === 'cheese-fries-tots' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                      Choose Base
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedCheeseBase('Skin On Fries')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedCheeseBase === 'Skin On Fries'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Skin On Fries
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCheeseBase('Potato Tots')}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                          selectedCheeseBase === 'Potato Tots'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                      >
                        Potato Tots
                      </button>
                    </div>
                  </div>
                )}

                {/* 11. Kids Meal */}
                {customizingItem.customizationType === 'kids-meal' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Main Choice (Fries included)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['4 Nuggets', 'Mini Cheeseburger', 'Mini Chicken Burger'] as const).map((main) => (
                          <button
                            key={main}
                            type="button"
                            onClick={() => setSelectedKidsMain(main)}
                            className={cn(
                              'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center leading-snug',
                              selectedKidsMain === main
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {main}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Drink (Included)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SOFT_DRINK_CHOICES.map((drink) => (
                          <button
                            key={drink}
                            type="button"
                            onClick={() => setSelectedDrink(drink)}
                            className={cn(
                              'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                              selectedDrink === drink
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {drink}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 12. Munch Box */}
                {customizingItem.customizationType === 'munch-box' && (
                  <>
                    <p className="text-xs text-gray-400">
                      Includes wings, some doner kebab, peri peri chicken, skin-on fries and a drink.
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Burger
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMunchBurger('Chicken Burger')}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedMunchBurger === 'Chicken Burger'
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          Chicken Burger
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMunchBurger('Beef Burger')}
                          className={cn(
                            'p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center',
                            selectedMunchBurger === 'Beef Burger'
                              ? 'bg-orange-600 text-white border-orange-500'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          )}
                        >
                          Beef Burger
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Drink (Included)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SOFT_DRINK_CHOICES.map((drink) => (
                          <button
                            key={drink}
                            type="button"
                            onClick={() => setSelectedDrink(drink)}
                            className={cn(
                              'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                              selectedDrink === drink
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {drink}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 13. CRRAVE Box */}
                {customizingItem.customizationType === 'crrave-box' && (
                  <>
                    <p className="text-xs text-gray-400">
                      Includes loaded fries, 3 grilled wings and a can of drink.
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Any Burger
                      </label>
                      <select
                        value={selectedCrraveBurger}
                        onChange={(e) => setSelectedCrraveBurger(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {ALL_BURGER_NAMES.map((name) => (
                          <option key={name} value={name} className="bg-[#141414] text-white">
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-300 block">
                        Choose Drink (Included)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SOFT_DRINK_CHOICES.map((drink) => (
                          <button
                            key={drink}
                            type="button"
                            onClick={() => setSelectedDrink(drink)}
                            className={cn(
                              'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                              selectedDrink === drink
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {drink}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-white/10 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCustomizingItem(null)}
                  className="w-1/3 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCustomizationAndAdd}
                  className="w-2/3 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check size={18} />
                  <span>Add to Order ({formatPrice(calculateCustomizedPrice())})</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dedicated Smash & Chicken Burger Customizer Modal */}
      <SmashBurgerModal
        isOpen={!!smashModalItem}
        item={smashModalItem}
        onClose={() => setSmashModalItem(null)}
        onAddToCart={handleSmashAddToCart}
      />

      {/* Dedicated Grills & Peri Peri Customizer Modal */}
      <GrillsPeriPeriModal
        isOpen={!!grillModalItem}
        item={grillModalItem}
        onClose={() => setGrillModalItem(null)}
        onAddToCart={handleGrillAddToCart}
      />

      {/* Dedicated Munch Box Customizer Modal (exact system from screenshots) */}
      <MunchBoxModal
        isOpen={!!munchBoxModalItem}
        item={munchBoxModalItem}
        onClose={() => setMunchBoxModalItem(null)}
        onAddToCart={handleMunchBoxAddToCart}
      />

      {/* Dedicated Toasted Sandwich Customizer Modal */}
      <ToastedSandwichModal
        isOpen={!!toastedSandwichModalItem}
        item={toastedSandwichModalItem}
        onClose={() => setToastedSandwichModalItem(null)}
        onAddToCart={handleToastedSandwichAddToCart}
      />

      {/* Dedicated Wrap Customizer Modal (all wrap category items) */}
      <WrapModal
        isOpen={!!wrapModalItem}
        item={wrapModalItem}
        onClose={() => setWrapModalItem(null)}
        onAddToCart={handleWrapAddToCart}
      />

      {/* Dedicated Crrave Box Customizer Modal (exact setup from screenshots) */}
      <CrraveBoxModal
        isOpen={!!crraveBoxModalItem}
        item={crraveBoxModalItem}
        onClose={() => setCrraveBoxModalItem(null)}
        onAddToCart={handleCrraveBoxAddToCart}
      />

      {/* Dedicated General Category Customizer Modal (for all other menu items) */}
      <GeneralItemCustomizerModal
        isOpen={!!generalModalItem}
        item={generalModalItem}
        onClose={() => setGeneralModalItem(null)}
        onAddToCart={handleGeneralAddToCart}
      />
    </div>
  );
}
