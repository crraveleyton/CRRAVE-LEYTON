import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface ToastedSandwichItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface ToastedSandwichModalProps {
  isOpen: boolean;
  item: ToastedSandwichItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const MEAT_OPTIONS = [
  { id: 'chicken', label: 'Chicken' },
  { id: 'beef', label: 'Beef (two patties)' },
];

const MEAL_CHOICES = [
  { id: 'single', label: 'Single', extra: 0 },
  { id: 'add-fries', label: 'Add Fries', extra: 2.0 },
  { id: 'add-spicy-rice', label: 'Add Spicy Rice', extra: 2.0 },
];

export const ToastedSandwichModal: React.FC<ToastedSandwichModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Choose Meat (Chicken or Beef (two patties))
  // Step 2: Choose Meal option (Single, Add Fries £2.00, Add Spicy Rice £2.00)
  // Step 3: Summary Review & Quantity Stepper
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMeat, setSelectedMeat] = useState<string>('Chicken');
  const [selectedMeal, setSelectedMeal] = useState<{ id: string; label: string; extra: number }>(MEAL_CHOICES[0]);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMeat('Chicken');
      setSelectedMeal(MEAL_CHOICES[0]);
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 4.95;
  const singleUnitTotal = basePrice + selectedMeal.extra;
  const grandTotal = singleUnitTotal * quantity;

  const handleFinishAndAdd = () => {
    const variantParts = [selectedMeat, selectedMeal.label];

    onAddToCart({
      id: item.id,
      name: item.name,
      price: singleUnitTotal,
      variant: variantParts.join(' | '),
      quantity,
    });

    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="toastedsandwich-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="toastedsandwich-modal-dialog"
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
                onClick={() => setStep((s) => (s - 1) as any)}
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
            {/* STEP 1: CHOOSE MEAT */}
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
                    Choose Meat – Choose one
                  </h3>

                  <div className="space-y-2.5">
                    {MEAT_OPTIONS.map((meat, mIdx) => {
                      const isSelected = selectedMeat === meat.label;
                      return (
                        <label
                          key={`${meat.id}-${mIdx}`}
                          onClick={() => setSelectedMeat(meat.label)}
                          className={cn(
                            'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                            isSelected
                              ? 'bg-zinc-900 border-[#f5a623]'
                              : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                                isSelected
                                  ? 'border-[#f5a623] bg-[#f5a623]'
                                  : 'border-zinc-500 bg-transparent'
                              )}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-black" />
                              )}
                            </div>
                            <span className="font-normal text-sm sm:text-base text-white">
                              {meat.label}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE MEAL OPTION */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Sides & Meal – Choose one
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {MEAL_CHOICES.map((choice, cIdx) => {
                    const isSelected = selectedMeal.id === choice.id;
                    return (
                      <label
                        key={`${choice.id}-${cIdx}`}
                        onClick={() => setSelectedMeal(choice)}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                              isSelected
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-500 bg-transparent'
                            )}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-normal text-sm sm:text-base text-white">
                            {choice.label}
                          </span>
                        </div>
                        {choice.extra > 0 && (
                          <span className="font-semibold text-sm text-zinc-300">
                            +{formatPrice(choice.extra)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">{selectedMeat}</div>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL SUMMARY REVIEW */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                <div className="space-y-2.5 pt-1 text-sm">
                  <div className="flex justify-between items-center text-base font-semibold">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">{selectedMeat}</div>
                  <div className="flex justify-between items-center text-zinc-300 pl-1">
                    <span>{selectedMeal.label}</span>
                    {selectedMeal.extra > 0 && (
                      <span>+{formatPrice(selectedMeal.extra)}</span>
                    )}
                  </div>
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
                onClick={() => setStep(3)}
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

          {step === 3 && (
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
