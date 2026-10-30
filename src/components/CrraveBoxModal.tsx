import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

export interface CrraveBoxItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
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
  const burgerObj = BURGER_OPTIONS.find((b) => b.name === selectedBurger);
  const burgerExtra = burgerObj ? burgerObj.extraPrice : 0;

  const extrasCost = selectedExtras.reduce((sum, extraName) => {
    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
    return sum + (ext ? ext.price : 0);
  }, 0);

  const singleUnitTotal = basePrice + burgerExtra + extrasCost;
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
      quantity: quantity,
    });
    onClose();
  };

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
          className="relative w-full max-w-lg bg-[#000000] text-white sm:rounded-2xl shadow-2xl border border-zinc-800 flex flex-col max-h-[100dvh] sm:max-h-[92vh] overflow-hidden z-10"
        >
          {/* Top Bar */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-[#000000] shrink-0">
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

            {step > 1 ? (
              <h1 className="font-semibold text-base sm:text-lg text-white tracking-tight truncate max-w-[280px]">
                {item.name}
              </h1>
            ) : (
              <div className="flex-1" />
            )}

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
            {/* STEP 1: SELECT BURGER – CHOOSE ONE */}
            {step === 1 && (
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {item.name}
                  </h2>
                  <p className="text-base text-zinc-300 mt-2 font-medium">
                    Select Burger – Choose one
                  </p>
                </div>

                {/* 2-column on sm/desktop, compact list on mobile to eliminate excessive scrolling */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-[58vh] sm:max-h-[62vh] overflow-y-auto pr-1">
                  {BURGER_OPTIONS.map((burger) => {
                    const isSelected = selectedBurger === burger.name;
                    return (
                      <label
                        key={burger.id}
                        onClick={() => {
                          setSelectedBurger(burger.name);
                          setTimeout(() => setStep(2), 120);
                        }}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
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
                          <span className="font-medium text-xs sm:text-sm text-white truncate">
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
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Extras – Choose up to 3
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {EXTRA_OPTIONS.map((extra) => {
                    const isChecked = selectedExtras.includes(extra.name);
                    return (
                      <label
                        key={extra.id}
                        onClick={() => handleToggleExtra(extra.name)}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
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
                          <span className="font-medium text-sm sm:text-base text-white">
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
                  {selectedExtras.map((extraName) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={extraName}
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
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Drink – Choose one
                  </h3>
                </div>

                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {DRINK_OPTIONS.map((drink) => {
                    const isSelected = selectedDrink === drink;
                    return (
                      <label
                        key={drink}
                        onClick={() => {
                          setSelectedDrink(drink);
                          setTimeout(() => setStep(4), 120);
                        }}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
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
                  {selectedExtras.map((extraName) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={extraName}
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
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                {/* Summary List */}
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-base font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice + burgerExtra)}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-300 pl-1">{selectedBurger}</div>

                  {selectedExtras.map((extraName) => {
                    const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={extraName}
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
          {/* Step 1: Total display with Next button */}
          {step === 1 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between">
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
            <div className="border-t border-zinc-900 bg-[#000000] px-5 py-4 shrink-0 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#f5a623] hover:bg-[#e0961b] text-black font-bold text-base transition-transform active:scale-98 shadow-lg cursor-pointer text-center"
              >
                {selectedExtras.length > 0 ? 'Next' : 'Skip'}
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

          {/* Step 3: Drink selection total bar */}
          {step === 3 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between">
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

          {/* Step 4: Final Summary Review & Quantity Pill */}
          {step === 4 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-5 py-4 shrink-0 flex items-center gap-3">
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
