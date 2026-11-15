import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface CrraveBoxItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface CrraveBoxModalProps {
  isOpen: boolean;
  item: CrraveBoxItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

interface BurgerOption {
  id: string;
  name: string;
  extraPrice: number;
}

const BURGER_OPTIONS: BurgerOption[] = [
  { id: 'cheeseburger', name: 'Cheeseburger', extraPrice: 0 },
  { id: 'double-cheeseburger', name: 'Double Cheeseburger', extraPrice: 0 },
  { id: 'big-crrave', name: 'Big Crrave', extraPrice: 0 },
  { id: 'bbq-cheeseburger', name: 'BBQ Cheeseburger', extraPrice: 0 },
  { id: 'double-truffle', name: 'Double Truffle Cheeseburger', extraPrice: 0 },
  { id: 'garlic-mayo', name: 'Garlic Mayo Cheeseburger', extraPrice: 0 },
  { id: 'spicy-smash', name: 'Spicy Smash Burger', extraPrice: 6.50 },
  { id: 'spicy-chicken', name: 'Spicy Chicken Burger', extraPrice: 0 },
  { id: 'dynamite-naga', name: 'Dynamite Naga Chicken', extraPrice: 0 },
  { id: 'buttermilk-chicken', name: 'Buttermilk Chicken Burger', extraPrice: 0 },
  { id: 'smokey-bbq', name: 'Smokey BBQ Chicken Burger', extraPrice: 0 },
  { id: 'grill-chicken', name: 'Grill Chicken Burger', extraPrice: 0 },
];

interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

const EXTRA_OPTIONS: ExtraOption[] = [
  { id: 'turkey-bacon', name: 'Add Turkey Bacon', price: 2.50 },
  { id: 'extra-cheese', name: 'Extra Cheese', price: 0.50 },
  { id: 'extra-patty', name: 'Extra Patty', price: 2.00 },
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

export const CrraveBoxModal: React.FC<CrraveBoxModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Select Burger – Choose one
  // Step 2: Extras – Choose up to 3
  // Step 3: Choose your Drink – Choose one
  // Step 4: Summary Review & Quantity Stepper
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedBurger, setSelectedBurger] = useState<string>('Cheeseburger');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola Classic');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedBurger('Cheeseburger');
      setSelectedExtras([]);
      setSelectedDrink('Coca-Cola Classic');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 10.0;

  // Extra price for chosen burger
  const burgerExtra =
    BURGER_OPTIONS.find((b) => b.name === selectedBurger)?.extraPrice || 0;

  // Extra price for chosen extras
  const extrasTotal = selectedExtras.reduce((sum, extraName) => {
    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const singleUnitTotal = basePrice + burgerExtra + extrasTotal;
  const grandTotal = singleUnitTotal * quantity;

  const handleToggleExtra = (extraName: string) => {
    if (selectedExtras.includes(extraName)) {
      setSelectedExtras(selectedExtras.filter((e) => e !== extraName));
    } else {
      if (selectedExtras.length >= 3) return;
      setSelectedExtras([...selectedExtras, extraName]);
    }
  };

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [selectedBurger];

    if (selectedExtras.length > 0) {
      variantParts.push(`Extras: ${selectedExtras.join(', ')}`);
    }

    variantParts.push(`Drink: ${selectedDrink}`);

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
      {/* Outer wrapper: clicking on backdrop or side of screen closes popup */}
      <div
        key="crravebox-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        {/* Modal Window */}
        <motion.div
          key="crravebox-modal-dialog"
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

          {/* Modal Body - Single Scrollable Container (NO nested scrollbar!) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* STEP 1: SELECT BURGER – CHOOSE ONE */}
            {step === 1 && (
              <div className="space-y-4">
                <ItemImageBanner image={item.image || item.heroImage} name={item.name} />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {item.name}
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 mt-2 font-medium">
                    Select Burger – Choose one
                  </p>
                </div>

                {/* Single scroll list (NO max-h or inner overflow-y-auto) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {BURGER_OPTIONS.map((burger, bIdx) => {
                    const isSelected = selectedBurger === burger.name;
                    return (
                      <label
                        key={`${burger.id}-${bIdx}`}
                        onClick={() => setSelectedBurger(burger.name)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                              isSelected
                                ? 'border-[#f5a623] bg-[#f5a623]'
                                : 'border-zinc-500 bg-transparent'
                            )}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-black" />
                            )}
                          </div>
                          <span className="font-normal text-xs sm:text-sm text-white truncate">
                            {burger.name}
                          </span>
                        </div>
                        {burger.extraPrice > 0 && (
                          <span className="font-semibold text-xs text-zinc-300 shrink-0 ml-2">
                            +{formatPrice(burger.extraPrice)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: EXTRAS – CHOOSE UP TO 3 */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Extras – Choose up to 3
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {EXTRA_OPTIONS.map((extra, eIdx) => {
                    const isChecked = selectedExtras.includes(extra.name);
                    return (
                      <label
                        key={`${extra.id}-${eIdx}`}
                        onClick={() => handleToggleExtra(extra.name)}
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
                            {extra.name}
                          </span>
                        </div>
                        <span className="font-semibold text-sm text-zinc-300">
                          +{formatPrice(extra.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Summary Section matching Screenshot 2 */}
                <div className="bg-[#262626] rounded-xl p-4 space-y-2 mt-4">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice + burgerExtra)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 pl-1">{selectedBurger}</div>
                  {selectedExtras.map((extraName, idx) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={`crrave-s2-extra-${extraName}-${idx}`}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-700/60"
                      >
                        <span>{extraName}</span>
                        <span>+{formatPrice(ext?.price || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE YOUR DRINK – CHOOSE ONE */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Drink – Choose one
                  </h3>
                </div>

                <div className="space-y-2">
                  {DRINK_OPTIONS.map((drink, dIdx) => {
                    const isSelected = selectedDrink === drink;
                    return (
                      <label
                        key={`${drink}-${dIdx}`}
                        onClick={() => setSelectedDrink(drink)}
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
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3',
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

                {/* Summary Section matching Screenshot 1 */}
                <div className="bg-[#262626] rounded-xl p-4 space-y-2 mt-4">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice + burgerExtra)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 pl-1">{selectedBurger}</div>
                  {selectedExtras.map((extraName, idx) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={`crrave-s3-extra-${extraName}-${idx}`}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-700/60"
                      >
                        <span>{extraName}</span>
                        <span>+{formatPrice(ext?.price || 0)}</span>
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
                  <div className="flex justify-between items-center text-base font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice + burgerExtra)}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-300 pl-1">{selectedBurger}</div>

                  {selectedExtras.map((extraName, idx) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={`crrave-s4-extra-${extraName}-${idx}`}
                        className="flex justify-between items-center text-sm text-zinc-300 pl-1"
                      >
                        <span>{extraName}</span>
                        <span>+{formatPrice(ext?.price || 0)}</span>
                      </div>
                    );
                  })}

                  <div className="text-sm text-zinc-300 pl-1">{selectedDrink}</div>
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
                className="flex-1 py-3.5 bg-[#f5a623] hover:bg-[#e09612] text-black font-semibold rounded-xl text-center text-sm transition-all cursor-pointer active:scale-[0.98]"
              >
                {selectedExtras.length === 0 ? 'Skip' : 'Continue'}
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
