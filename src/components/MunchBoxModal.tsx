import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

export interface MunchBoxItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface MunchBoxModalProps {
  isOpen: boolean;
  item: MunchBoxItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const DONNER_OPTIONS = ['Chicken Donner', 'Beef Donner'];

const BURGER_OPTIONS = [
  'Cheeseburger',
  'Beef Burger',
  'Double Cheeseburger',
  'Big Crrave',
  'Bacon House Burger',
  'Cravve Daddy',
  'BBQ Cheeseburger',
  'Double Truffle Cheeseburger',
  'Green Chilli Cheeseburger',
  'Garlic Mayo Cheeseburger',
  'Blue Cheeseburger',
  'Peanut Butter Smash',
  'OG Chicken n Bun',
  'Hot as Cluck Chicken n Bun',
  'Smokey BBQ Chicken n Bun',
  'Buffalo Chicken n Bun',
  'Truffle Chicken n Bun',
  'Spicy Chicken Burger',
  'Dynamite Naga Chicken',
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

const EXTRA_OPTIONS = [
  { id: 'extra-bacon', name: 'Add Turkey Bacon', price: 2.5 },
  { id: 'extra-cheese', name: 'Extra Cheese', price: 0.5 },
  { id: 'extra-patty', name: 'Extra Patty', price: 2.0 },
];

export const MunchBoxModal: React.FC<MunchBoxModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Donner (Chicken or Beef)
  // Step 2: Burger (Choose 1 from 19)
  // Step 3: Drink (Choose 1 from 7)
  // Step 4: Extras (Choose up to 3)
  // Step 5: Summary Review & Quantity
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [selectedDonner, setSelectedDonner] = useState<string>('Chicken Donner');
  const [selectedBurger, setSelectedBurger] = useState<string>('Cheeseburger');
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola Classic');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDonner('Chicken Donner');
      setSelectedBurger('Cheeseburger');
      setSelectedDrink('Coca-Cola Classic');
      setSelectedExtras([]);
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 13.95;
  const extrasTotal = selectedExtras.reduce((sum, extraName) => {
    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const singleUnitTotal = basePrice + extrasTotal;
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
    const variantParts: string[] = [
      selectedDonner,
      selectedBurger,
      selectedDrink,
    ];

    if (selectedExtras.length > 0) {
      variantParts.push(`Extras: ${selectedExtras.join(', ')}`);
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
                onClick={() => setStep((s) => (s - 1) as any)}
                className="p-1 -ml-1 text-white hover:text-gray-300 transition-colors cursor-pointer"
                aria-label="Previous step"
              >
                <ArrowLeft size={22} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            <h1 className="font-semibold text-base sm:text-lg text-white tracking-tight">
              Munch Box
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
            {/* STEP 1: CHOOSE YOUR DONNER */}
            {step === 1 && (
              <div>
                {/* Hero food picture matching Screenshot 1 */}
                <div className="w-full h-52 sm:h-60 overflow-hidden bg-zinc-900">
                  <img
                    src="/assets/burgers/munchbox_hero.jpg"
                    alt="Munch Box"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        '/public/assets/aistudio/Screenshot_2026-10-29_153738_c3710a83.jpg';
                    }}
                  />
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Munch Box
                    </h2>
                    <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                      Chicken or beef meal deal and can drink.
                    </p>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                      Beef or chicken donner, any smash or chicken burger, 3 pc wings, 1 pc mac n cheese, 1 pc peri peri chicken, skin on fries, and any can of drink.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Choose your Donner – Munch Box – Choose one
                    </h3>

                    <div className="space-y-3">
                      {DONNER_OPTIONS.map((donner) => {
                        const isSelected = selectedDonner === donner;
                        return (
                          <label
                            key={donner}
                            onClick={() => {
                              setSelectedDonner(donner);
                              setStep(2);
                            }}
                            className={cn(
                              'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-zinc-900 border-[#f5a623]'
                                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                            )}
                          >
                            <span className="font-medium text-base text-white">
                              {donner}
                            </span>
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
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
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE YOUR BURGER */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Burger – Munch Box – Choose one
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select any smash or chicken burger
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {BURGER_OPTIONS.map((burger) => {
                    const isSelected = selectedBurger === burger;
                    return (
                      <label
                        key={burger}
                        onClick={() => {
                          setSelectedBurger(burger);
                          setStep(3);
                        }}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <span className="font-medium text-sm text-white">
                          {burger}
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

                {/* Summary Section matching Screenshot 5 */}
                <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">Munch Box</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">{selectedDonner}</div>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE YOUR DRINK */}
            {step === 3 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choose your Drink – Choose one
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select any cold can of drink
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
                    <span className="text-white">Munch Box</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">{selectedDonner}</div>
                  <div className="text-xs text-zinc-400">{selectedBurger}</div>
                </div>
              </div>
            )}

            {/* STEP 4: EXTRAS */}
            {step === 4 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Extras – Choose up to 3
                  </h3>
                </div>

                <div className="space-y-3">
                  {EXTRA_OPTIONS.map((extra) => {
                    const isChecked = selectedExtras.includes(extra.name);
                    return (
                      <label
                        key={extra.id}
                        onClick={() => handleToggleExtra(extra.name)}
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

                {/* Summary Section matching Screenshot 4 */}
                <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">Munch Box</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">{selectedDonner}</div>
                  <div className="text-xs text-zinc-400">{selectedBurger}</div>
                  <div className="text-xs text-zinc-400">{selectedDrink}</div>
                  {selectedExtras.map((extraName) => {
                    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={extraName}
                        className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-800/60"
                      >
                        <span>{extraName}</span>
                        <span>+{formatPrice(extra?.price || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: FINAL SUMMARY REVIEW */}
            {step === 5 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                {/* Summary List matching Screenshot 2 */}
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center text-base font-medium">
                    <span className="text-white">Munch Box</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 pl-1">{selectedDonner}</div>
                  <div className="text-sm text-zinc-300 pl-1">{selectedBurger}</div>
                  <div className="text-sm text-zinc-300 pl-1">{selectedDrink}</div>
                  {selectedExtras.map((extraName) => {
                    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
                    return (
                      <div
                        key={extraName}
                        className="flex justify-between items-center text-sm text-zinc-300 pl-1"
                      >
                        <span>{extraName}</span>
                        <span>+{formatPrice(extra?.price || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {/* Step 1, 2, 3: Just total display */}
          {(step === 1 || step === 2 || step === 3) && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-6 py-4 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Next &gt;
              </button>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  TOTAL
                </span>
                <span className="font-bold text-base sm:text-lg text-white">
                  {formatPrice(basePrice)}
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Skip or Next button matching Screenshot 4 */}
          {step === 4 && (
            <div className="border-t border-zinc-800/80 bg-[#0d0d0d] px-5 py-4 shrink-0 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep(5)}
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

          {/* Step 5: Quantity pill & Add to Basket matching Screenshot 2 */}
          {step === 5 && (
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
