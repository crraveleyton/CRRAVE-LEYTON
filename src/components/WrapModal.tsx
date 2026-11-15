import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

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
  // Step 1: Make it a Meal? (Single / Meal +£3.50)
  // Step 2: Choice of Sauces (Choose up to 8, +£0.30 each)
  // Step 3: Choose your Drink (only if Meal is selected)
  // Step 4: Summary Review & Quantity Stepper
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
  const saucesCost = selectedSauces.length * 0.3;

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="wrap-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="wrap-modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#000000] text-white sm:rounded-2xl shadow-2xl border border-zinc-800 flex flex-col max-h-[100dvh] sm:max-h-[90vh] overflow-hidden z-10"
        >
          {/* Top Bar - explicitly sticky, highest z-index inside modal */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-[#000000] shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 4 && mealOption === 'single') {
                    setStep(2);
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

          {/* Modal Body - Single Scrollable Area (NO duplicate inner scrollbar!) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* STEP 1: MAKE IT A MEAL? */}
            {step === 1 && (
              <div className="space-y-5">
                <ItemImageBanner image={item.image || item.heroImage} name={item.name} />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Make it a Meal? – Choose one
                  </h3>

                  <div className="space-y-2.5">
                    {/* Option A: Make it a Meal */}
                    <label
                      onClick={() => setMealOption('meal')}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                        mealOption === 'meal'
                          ? 'bg-zinc-900 border-[#f5a623]'
                          : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                            mealOption === 'meal'
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500 bg-transparent'
                          )}
                        >
                          {mealOption === 'meal' && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="font-normal text-sm sm:text-base text-white">
                          Make it a Meal (Drinks & Chips)
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-zinc-300">
                        +£3.50
                      </span>
                    </label>

                    {/* Option B: Single */}
                    <label
                      onClick={() => setMealOption('single')}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                        mealOption === 'single'
                          ? 'bg-zinc-900 border-[#f5a623]'
                          : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                            mealOption === 'single'
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500 bg-transparent'
                          )}
                        >
                          {mealOption === 'single' && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="font-normal text-sm sm:text-base text-white">
                          Single
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOICE OF SAUCES */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choice of Sauces – Choose up to 8
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select your favourite sauces (+£0.30 each)
                  </p>
                </div>

                <div className="space-y-2.5">
                  {SAUCE_OPTIONS.map((sauce, sIdx) => {
                    const isChecked = selectedSauces.includes(sauce.name);
                    return (
                      <label
                        key={`${sauce.id}-${sIdx}`}
                        onClick={() => handleToggleSauce(sauce.name)}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
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
                          <span className="font-normal text-sm sm:text-base text-white">
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

                {/* Summary Section */}
                <div className="bg-[#262626] rounded-xl p-4 space-y-2 mt-4">
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
                  {selectedSauces.map((sauceName, idx) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={`wrap-s2-sauce-${sauceName}-${idx}`}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-700/60"
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
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Drink – Choose one
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select a drink included with your meal
                  </p>
                </div>

                <div className="space-y-2">
                  {DRINK_OPTIONS.map((drink, dIdx) => {
                    const isSelected = selectedDrink === drink;
                    return (
                      <label
                        key={`${drink}-${dIdx}`}
                        onClick={() => {
                          setSelectedDrink(drink);
                          setTimeout(() => setStep(4), 100);
                        }}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                        )}
                      >
                        <span className="font-normal text-sm sm:text-base text-white">
                          {drink}
                        </span>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ml-3',
                            isSelected
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500 bg-transparent'
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

                {/* Summary Section */}
                <div className="bg-[#262626] rounded-xl p-4 space-y-2 mt-4">
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
                  {selectedSauces.map((sauceName, idx) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={`wrap-s3-sauce-${sauceName}-${idx}`}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-700/60"
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
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-base font-semibold">
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
                      <span className="font-semibold">+{formatPrice(mealCost)}</span>
                    )}
                  </div>

                  {selectedSauces.map((sauceName, idx) => {
                    const s = SAUCE_OPTIONS.find((opt) => opt.name === sauceName);
                    return (
                      <div
                        key={`wrap-s4-sauce-${sauceName}-${idx}`}
                        className="flex justify-between items-center text-sm text-zinc-300 pl-1"
                      >
                        <span>{sauceName}</span>
                        <span>+{formatPrice(s?.price || 0.3)}</span>
                      </div>
                    );
                  })}

                  {mealOption === 'meal' && (
                    <div className="text-sm text-zinc-300 pl-1">{selectedDrink}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {step === 1 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 bg-[#f5a623] hover:bg-[#e09612] text-black font-bold rounded-xl text-center text-sm transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-amber-500/10"
              >
                Next
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

          {step === 2 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  if (mealOption === 'meal') {
                    setStep(3);
                  } else {
                    setStep(4);
                  }
                }}
                className="flex-1 py-3.5 bg-[#f5a623] hover:bg-[#e09612] text-black font-semibold rounded-xl text-center text-sm transition-all cursor-pointer active:scale-[0.98]"
              >
                {selectedSauces.length === 0 ? 'Skip' : 'Continue'}
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

          {step === 3 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 bg-[#f5a623] hover:bg-[#e09612] text-black font-bold rounded-xl text-center text-sm transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-amber-500/10"
              >
                Next
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

          {step === 4 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-5 py-4 shrink-0 flex items-center gap-3">
              <div className="flex items-center bg-[#2b2b2b] rounded-xl px-2 py-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-gray-300 disabled:opacity-40 cursor-pointer"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold text-sm text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-gray-300 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleFinishAndAdd}
                className="flex-1 py-3.5 bg-[#f5a623] hover:bg-[#e09612] text-black font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-between px-5 active:scale-[0.98]"
              >
                <span>Add to basket</span>
                <span className="font-extrabold">{formatPrice(grandTotal)}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
