import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

export interface WrapItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface WrapModalProps {
  isOpen: boolean;
  item: WrapItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const SAUCE_OPTIONS = [
  { id: 'bbq-mayo', name: 'BBQ Mayo', price: 0.3 },
  { id: 'bbq-sauce', name: 'BBQ Sauce', price: 0.3 },
  { id: 'buffalo', name: 'Buffalo', price: 0.3 },
  { id: 'chilli-sauce', name: 'Chilli Sauce', price: 0.3 },
  { id: 'garlic-mayo', name: 'Garlic Mayo', price: 0.3 },
  { id: 'house-sauce', name: 'House Sauce', price: 0.3 },
  { id: 'naga-mayo', name: 'Naga Mayo', price: 0.3 },
  { id: 'truffle-mayo', name: 'Truffle Mayo', price: 0.3 },
];

const DRINK_OPTIONS = [
  'Coca-Cola Classic',
  'Diet Coke',
  'Fanta',
  'Sprite',
  'Miranda',
  'Rubicon',
  'Still Water',
];

export const WrapModal: React.FC<WrapModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Make it a Meal? (Make it a Meal +£3.50 or Single)
  // Step 2: Choice of Sauces (Choose up to 8, +£0.30 each)
  // Step 3: Choose your Drink (Only if Make it a Meal was selected)
  // Step 4: Final Summary Review & Quantity
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [mealOption, setMealOption] = useState<'meal' | 'single'>('single');
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola Classic');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMealOption('single');
      setSelectedSauces([]);
      setSelectedDrink('Coca-Cola Classic');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 4.95;
  const mealCost = mealOption === 'meal' ? 3.5 : 0;
  const saucesCost = selectedSauces.reduce((sum, sauceName) => {
    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
    return sum + (s ? s.price : 0.3);
  }, 0);

  const singleUnitTotal = basePrice + mealCost + saucesCost;
  const grandTotal = singleUnitTotal * quantity;

  const handleToggleSauce = (sauceName: string) => {
    if (selectedSauces.includes(sauceName)) {
      setSelectedSauces(selectedSauces.filter((s) => s !== sauceName));
    } else {
      if (selectedSauces.length >= 8) return;
      setSelectedSauces([...selectedSauces, sauceName]);
    }
  };

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [];

    if (mealOption === 'meal') {
      variantParts.push(`Meal (Drinks & Chips - ${selectedDrink})`);
    } else {
      variantParts.push('Single');
    }

    if (selectedSauces.length > 0) {
      variantParts.push(`Sauces: ${selectedSauces.join(', ')}`);
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

  const heroImg = item.heroImage || item.image || '/assets/wraps/wrap_hero.jpg';

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

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0d0d0d] text-white sm:rounded-2xl shadow-2xl border border-zinc-800 flex flex-col max-h-[100dvh] sm:max-h-[90vh] overflow-hidden z-10"
        >
          {/* Top Bar */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-[#0d0d0d] shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 4 && mealOption === 'single') {
                    setStep(2); // Skip drink step if going back from review to sauces
                  } else {
                    setStep((s) => (s - 1) as any);
                  }
                }}
                className="p-1 -ml-1 text-white hover:text-gray-300 transition-colors cursor-pointer"
                aria-label="Previous step"
              >
                <ArrowLeft size={22} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            <h1 className="font-semibold text-base sm:text-lg text-white tracking-tight truncate max-w-[280px]">
              {item.name}
            </h1>

            <button
              type="button"
              onClick={onClose}
              className="p-1 -mr-1 text-white hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={22} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto">
            {/* STEP 1: MAKE IT A MEAL? */}
            {step === 1 && (
              <div>
                {/* Hero image matching Screenshot 1 */}
                <div className="w-full h-52 sm:h-60 overflow-hidden bg-zinc-900">
                  <img
                    src={heroImg}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        '/assets/wraps/wrap_hero.jpg';
                    }}
                  />
                </div>

                <div className="p-5 sm:p-6 space-y-6">
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

                  <div className="space-y-3 pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Make it a Meal? – Choose one
                    </h3>

                    <div className="space-y-3">
                      {/* Option A: Make it a Meal */}
                      <label
                        onClick={() => {
                          setMealOption('meal');
                          setStep(2);
                        }}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none',
                          mealOption === 'meal'
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                              mealOption === 'meal'
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-600 bg-transparent'
                            )}
                          >
                            {mealOption === 'meal' && (
                              <div className="w-2 h-2 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-medium text-base text-white">
                            Make it a Meal (Drinks & Chips)
                          </span>
                        </div>
                        <span className="font-semibold text-sm text-zinc-300">
                          +£3.50
                        </span>
                      </label>

                      {/* Option B: Single */}
                      <label
                        onClick={() => {
                          setMealOption('single');
                          setStep(2);
                        }}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none',
                          mealOption === 'single'
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                              mealOption === 'single'
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-600 bg-transparent'
                            )}
                          >
                            {mealOption === 'single' && (
                              <div className="w-2 h-2 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-medium text-base text-white">
                            Single
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOICE OF SAUCES */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choice of Sauces – Choose up to 8
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select your favourite sauces (+£0.30 each)
                  </p>
                </div>

                <div className="space-y-3">
                  {SAUCE_OPTIONS.map((sauce) => {
                    const isChecked = selectedSauces.includes(sauce.name);
                    return (
                      <label
                        key={sauce.id}
                        onClick={() => handleToggleSauce(sauce.name)}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                              isChecked
                                ? 'bg-[#f5a623] border-[#f5a623] text-black'
                                : 'border-zinc-600 bg-transparent'
                            )}
                          >
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="font-medium text-base text-white">
                            {sauce.name}
                          </span>
                        </div>
                        <span className="font-semibold text-sm text-zinc-300">
                          +{formatPrice(sauce.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Summary Section matching Screenshot 2 */}
                <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-zinc-300">
                    <span>
                      {mealOption === 'meal'
                        ? 'Make it a Meal (Drinks & Chips)'
                        : 'Single'}
                    </span>
                    {mealCost > 0 && (
                      <span className="font-semibold">
                        +{formatPrice(mealCost)}
                      </span>
                    )}
                  </div>
                  {selectedSauces.map((sauceName) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={sauceName}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-800/60"
                      >
                        <span>{sauceName}</span>
                        <span>+{formatPrice(s?.price || 0.3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE YOUR DRINK (IF MEAL) */}
            {step === 3 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Drink – Choose one
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select a drink included with your meal
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {DRINK_OPTIONS.map((drink) => {
                    const isSelected = selectedDrink === drink;
                    return (
                      <label
                        key={drink}
                        onClick={() => {
                          setSelectedDrink(drink);
                          setStep(4);
                        }}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <span className="font-medium text-sm text-white">
                          {drink}
                        </span>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3',
                            isSelected
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-600 bg-transparent'
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Summary Section matching Screenshot 3 */}
                <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-zinc-300">
                    <span>Make it a Meal (Drinks & Chips)</span>
                    <span className="font-semibold">+{formatPrice(mealCost)}</span>
                  </div>
                  {selectedSauces.map((sauceName) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={sauceName}
                        className="flex justify-between items-center text-xs text-zinc-300"
                      >
                        <span>{sauceName}</span>
                        <span>+{formatPrice(s?.price || 0.3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: FINAL SUMMARY REVIEW */}
            {step === 4 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                {/* Summary List */}
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center text-base font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-zinc-300 pl-1">
                    <span>
                      {mealOption === 'meal'
                        ? 'Make it a Meal (Drinks & Chips)'
                        : 'Single'}
                    </span>
                    {mealCost > 0 && (
                      <span className="font-semibold">
                        +{formatPrice(mealCost)}
                      </span>
                    )}
                  </div>

                  {mealOption === 'meal' && (
                    <div className="text-sm text-zinc-300 pl-1">{selectedDrink}</div>
                  )}

                  {selectedSauces.map((sauceName) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={sauceName}
                        className="flex justify-between items-center text-sm text-zinc-300 pl-1"
                      >
                        <span>{sauceName}</span>
                        <span>+{formatPrice(s?.price || 0.3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {/* Step 1: Total display with Next button */}
          {step === 1 && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-6 py-4 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Next &gt;
              </button>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  TOTAL
                </span>
                <span className="font-bold text-base sm:text-lg text-white">
                  {formatPrice(singleUnitTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Skip or Next button matching Screenshot 2 */}
          {step === 2 && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-5 py-4 shrink-0 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (mealOption === 'meal') {
                    setStep(3); // Choose drink
                  } else {
                    setStep(4); // Straight to review
                  }
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#f5a623] hover:bg-[#e0961b] text-black font-bold text-base transition-transform active:scale-98 shadow-lg cursor-pointer text-center"
              >
                {selectedSauces.length > 0 ? 'Next' : 'Skip'}
              </button>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  TOTAL
                </span>
                <span className="font-bold text-base sm:text-lg text-white">
                  {formatPrice(singleUnitTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Drink selection total */}
          {step === 3 && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-6 py-4 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Next &gt;
              </button>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  TOTAL
                </span>
                <span className="font-bold text-base sm:text-lg text-white">
                  {formatPrice(singleUnitTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Final Summary Review & Quantity Pill matching other modals */}
          {step === 4 && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-5 py-4 shrink-0 flex items-center gap-3">
              {/* Quantity Pill */}
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

              {/* Add to Basket Amber Button */}
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
