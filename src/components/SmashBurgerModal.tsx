import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

export interface SmashBurgerItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface SmashBurgerModalProps {
  isOpen: boolean;
  item: SmashBurgerItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const DRINK_OPTIONS = [
  'Coca-Cola',
  'Diet Coke',
  'Coke Zero',
  '7Up',
  'Tango Orange',
  'Capri Sun',
  'Still Water',
];

const EXTRA_OPTIONS = [
  { id: 'turkey-bacon', name: 'Add Turkey Bacon', price: 2.5 },
  { id: 'extra-cheese', name: 'Extra Cheese', price: 0.5 },
  { id: 'extra-patty', name: 'Extra Patty', price: 2.0 },
];

export const SmashBurgerModal: React.FC<SmashBurgerModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Meal Choice | Step 2: Extras | Step 3: Final Summary
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mealOption, setMealOption] = useState<'meal' | 'single'>('meal');
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  // Reset state whenever a new item is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMealOption('meal');
      setSelectedDrink('Coca-Cola');
      setSelectedExtras([]);
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price;
  const mealPrice = mealOption === 'meal' ? 2.0 : 0.0;
  const extrasTotal = selectedExtras.reduce((sum, extraName) => {
    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const singleUnitTotal = basePrice + mealPrice + extrasTotal;
  const grandTotal = singleUnitTotal * quantity;

  const handleToggleExtra = (extraName: string) => {
    if (selectedExtras.includes(extraName)) {
      setSelectedExtras(selectedExtras.filter((e) => e !== extraName));
    } else {
      if (selectedExtras.length >= 3) return; // Max 3
      setSelectedExtras([...selectedExtras, extraName]);
    }
  };

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [];

    if (mealOption === 'meal') {
      variantParts.push(`Meal (Chips & ${selectedDrink})`);
    } else {
      variantParts.push('Single');
    }

    if (selectedExtras.length > 0) {
      variantParts.push(selectedExtras.join(', '));
    }

    onAddToCart({
      id: item.id,
      name: item.name,
      price: singleUnitTotal,
      variant: variantParts.join(' | '),
      quantity: quantity,
    });
    onClose();
  };

  const heroImgSrc =
    item.heroImage || item.image || '/assets/burgers/cheeseburger_hero.jpg';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#141414] text-white sm:rounded-2xl shadow-2xl border border-zinc-800/80 flex flex-col max-h-[100dvh] sm:max-h-[90vh] overflow-hidden z-10"
        >
          {/* Top Bar for Steps 2 & 3 or Step 1 Header */}
          {step > 1 ? (
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#141414] shrink-0">
              <button
                type="button"
                onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {item.name}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm shadow-md cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            {/* STEP 1: MAKE IT A MEAL (SCREENSHOT 2) */}
            {step === 1 && (
              <div>
                {/* Burger Hero Image - hidden for Chicken Burgers as requested */}
                {item.category !== 'CHICKEN BURGERS' && (
                  <div className="w-full h-56 sm:h-64 bg-zinc-900 overflow-hidden relative">
                    <img
                      src={heroImgSrc}
                      alt={item.name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          '/assets/burgers/cheeseburger_hero.jpg';
                      }}
                    />
                  </div>
                )}

                <div className={cn("p-5 sm:p-6 space-y-6", item.category === 'CHICKEN BURGERS' && "pt-8")}>
                  {/* Title & Description */}
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Make it a Meal Section */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Make it a Meal - Choose one
                    </h3>

                    <div className="space-y-2">
                      {/* Option 1: Meal */}
                      <label
                        onClick={() => setMealOption('meal')}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                          mealOption === 'meal'
                            ? 'bg-zinc-800/80 border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              mealOption === 'meal'
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-500'
                            )}
                          >
                            {mealOption === 'meal' && (
                              <div className="w-2 h-2 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-semibold text-sm text-white">
                            Make it a Meal (Drinks & Chips)
                          </span>
                        </div>
                        <span className="font-bold text-sm text-zinc-300">
                          +£2.00
                        </span>
                      </label>

                      {/* Drink Selection if Meal is chosen */}
                      {mealOption === 'meal' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-8 pr-2 pt-1 pb-3 space-y-2"
                        >
                          <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider block">
                            Included Can of Drink:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {DRINK_OPTIONS.map((drink) => (
                              <button
                                key={drink}
                                type="button"
                                onClick={() => setSelectedDrink(drink)}
                                className={cn(
                                  'py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center',
                                  selectedDrink === drink
                                    ? 'bg-[#f5a623] text-black border-[#f5a623] font-bold shadow-sm'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                                )}
                              >
                                {drink}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Option 2: Single */}
                      <label
                        onClick={() => setMealOption('single')}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                          mealOption === 'single'
                            ? 'bg-zinc-800/80 border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              mealOption === 'single'
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-500'
                            )}
                          >
                            {mealOption === 'single' && (
                              <div className="w-2 h-2 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-semibold text-sm text-white">
                            Single
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">
                          +£0.00
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: EXTRAS - BURGERS - CHOOSE UP TO 3 (SCREENSHOT 3) */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-6">
                {/* Extras Checkboxes */}
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-3">
                    Extras - Burgers - Choose up to 3
                  </h3>

                  <div className="space-y-2.5">
                    {EXTRA_OPTIONS.map((extra) => {
                      const isChecked = selectedExtras.includes(extra.name);
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          onClick={() => handleToggleExtra(extra.name)}
                          className={cn(
                            'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer',
                            isChecked
                              ? 'bg-zinc-800/90 border-[#f5a623]'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={cn(
                                'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                                isChecked
                                  ? 'bg-[#f5a623] border-[#f5a623] text-black'
                                  : 'border-zinc-400 bg-transparent'
                              )}
                            >
                              {isChecked && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className="font-medium text-sm text-white">
                              {extra.name}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-zinc-300">
                            +{formatPrice(extra.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="pt-4 border-t border-zinc-800/80">
                  <h4 className="text-base font-bold text-white tracking-tight mb-3">
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>{item.name}</span>
                      <span className="font-semibold text-white">
                        {formatPrice(basePrice)}
                      </span>
                    </div>

                    {mealOption === 'meal' && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Make it a Meal (Drinks & Chips)</span>
                        <span className="font-semibold text-white">
                          {formatPrice(mealPrice)}
                        </span>
                      </div>
                    )}

                    {selectedExtras.map((extraName) => {
                      const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
                      return (
                        <div
                          key={extraName}
                          className="flex justify-between items-center text-zinc-300"
                        >
                          <span>{extraName}</span>
                          <span className="font-semibold text-white">
                            +{formatPrice(extra?.price || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL SUMMARY & QUANTITY (SCREENSHOT 4) */}
            {step === 3 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-4">
                    Summary
                  </h3>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-white font-semibold text-base">
                        {item.name}
                      </span>
                      <span className="font-bold text-white">
                        {formatPrice(basePrice)}
                      </span>
                    </div>

                    {mealOption === 'meal' && (
                      <div className="flex justify-between items-center text-sm text-zinc-300 border-t border-zinc-800/60 pt-2.5">
                        <div>
                          <span>Make it a Meal (Drinks & Chips)</span>
                          <span className="block text-xs text-[#f5a623] mt-0.5">
                            Drink: {selectedDrink}
                          </span>
                        </div>
                        <span className="font-semibold text-white">
                          +{formatPrice(mealPrice)}
                        </span>
                      </div>
                    )}

                    {selectedExtras.map((extraName) => {
                      const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
                      return (
                        <div
                          key={extraName}
                          className="flex justify-between items-center text-sm text-zinc-300 border-t border-zinc-800/60 pt-2.5"
                        >
                          <span>{extraName}</span>
                          <span className="font-semibold text-white">
                            +{formatPrice(extra?.price || 0)}
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center text-sm font-bold text-white border-t border-zinc-700/80 pt-3">
                      <span>Item Price (each)</span>
                      <span className="text-[#f5a623] text-base">
                        {formatPrice(singleUnitTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="border-t border-zinc-800 bg-[#141414] px-5 py-4 shrink-0">
            {step === 1 && (
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3.5 px-6 rounded-lg bg-[#f5a623] hover:bg-[#e0961b] text-black font-bold text-base transition-transform active:scale-98 shadow-md flex items-center justify-center cursor-pointer"
                >
                  Continue &gt;&gt;
                </button>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">
                    TOTAL
                  </span>
                  <span className="text-lg font-bold text-white mt-1 block leading-none">
                    {formatPrice(singleUnitTotal)}
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3.5 px-6 rounded-lg bg-[#f5a623] hover:bg-[#e0961b] text-black font-bold text-base transition-transform active:scale-98 shadow-md flex items-center justify-center cursor-pointer"
                >
                  {selectedExtras.length === 0 ? 'Skip' : 'Continue'}
                </button>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">
                    TOTAL
                  </span>
                  <span className="text-lg font-bold text-white mt-1 block leading-none">
                    {formatPrice(singleUnitTotal)}
                  </span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex items-center gap-3">
                {/* Quantity Pill (Screenshot 4) */}
                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700/80 px-2 py-1.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full bg-zinc-700/80 hover:bg-zinc-600 disabled:opacity-40 flex items-center justify-center text-white transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-base text-white px-2 min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-full bg-zinc-700/80 hover:bg-zinc-600 flex items-center justify-center text-white transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Add to Basket Button (Screenshot 4) */}
                <button
                  type="button"
                  onClick={handleFinishAndAdd}
                  className="flex-1 py-3.5 px-5 rounded-lg bg-[#f5a623] hover:bg-[#e0961b] text-black font-black text-base transition-transform active:scale-98 shadow-lg flex items-center justify-between cursor-pointer"
                >
                  <span>Add to basket</span>
                  <span className="font-black">{formatPrice(grandTotal)}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
