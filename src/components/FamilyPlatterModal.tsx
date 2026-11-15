import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus, Check } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface FamilyPlatterItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface FamilyPlatterModalProps {
  isOpen: boolean;
  item: FamilyPlatterItem | null;
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

const PERI_PERI_FLAVOURS = [
  'Mild Peri Peri',
  'Hot Peri Peri',
  'Lemon & Herbs',
  'Mango & Lime',
  'Naga Hot',
  'Hot, Lemon & Herbs',
];

const SIDE_OPTIONS = [
  'Skin on Fries',
  'Potato Tots',
  'Cajun Fries',
  'Peri Peri Fries',
  'Cheese Fries',
  'Onion Rings',
  'House Slaw',
  'House Salad',
  'Rice',
  'Spicy Rice',
];

const DRINK_OPTIONS = [
  'Fanta',
  'Sprite',
  'Miranda',
  'Rubicon',
  'Pepsi',
  'Pepsi Max',
  'Diet Pepsi',
  'Still Water',
  'Sparkling Water',
];

export const FamilyPlatterModal: React.FC<FamilyPlatterModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1 to 12
  const [step, setStep] = useState<number>(1);

  const [selectedBurger1, setSelectedBurger1] = useState<string>('Cheeseburger');
  const [selectedBurger2, setSelectedBurger2] = useState<string>('Cheeseburger');
  const [selectedBurger3, setSelectedBurger3] = useState<string>('Cheeseburger');
  const [selectedBurger4, setSelectedBurger4] = useState<string>('Cheeseburger');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedPeriFlavour, setSelectedPeriFlavour] = useState<string>('Mild Peri Peri');
  const [selectedSide1, setSelectedSide1] = useState<string>('Skin on Fries');
  const [selectedSide2, setSelectedSide2] = useState<string>('Potato Tots');
  const [selectedSide3, setSelectedSide3] = useState<string>('Cajun Fries');
  const [selectedSide4, setSelectedSide4] = useState<string>('Peri Peri Fries');
  const [selectedDrink, setSelectedDrink] = useState<string>('Fanta');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedBurger1('Cheeseburger');
      setSelectedBurger2('Cheeseburger');
      setSelectedBurger3('Cheeseburger');
      setSelectedBurger4('Cheeseburger');
      setSelectedExtras([]);
      setSelectedPeriFlavour('Mild Peri Peri');
      setSelectedSide1('Skin on Fries');
      setSelectedSide2('Potato Tots');
      setSelectedSide3('Cajun Fries');
      setSelectedSide4('Peri Peri Fries');
      setSelectedDrink('Fanta');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 44.95;

  const getBurgerExtra = (burgerName: string) => {
    const found = BURGER_OPTIONS.find((b) => b.name === burgerName);
    return found ? found.extraPrice : 0;
  };

  const burgersExtraTotal =
    getBurgerExtra(selectedBurger1) +
    getBurgerExtra(selectedBurger2) +
    getBurgerExtra(selectedBurger3) +
    getBurgerExtra(selectedBurger4);

  const extrasAddonTotal = selectedExtras.reduce((sum, extraName) => {
    const extra = EXTRA_OPTIONS.find((e) => e.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const singleUnitTotal = basePrice + burgersExtraTotal + extrasAddonTotal;
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
      `1st Burger: ${selectedBurger1}`,
      `2nd Burger: ${selectedBurger2}`,
      `3rd Burger: ${selectedBurger3}`,
      `4th Burger: ${selectedBurger4}`,
    ];

    if (selectedExtras.length > 0) {
      variantParts.push(`Burger Extras: ${selectedExtras.join(', ')}`);
    }

    variantParts.push(`Peri Peri Flavour: ${selectedPeriFlavour}`);
    variantParts.push(
      `Sides: 1) ${selectedSide1}, 2) ${selectedSide2}, 3) ${selectedSide3}, 4) ${selectedSide4}`
    );
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

  // Helper render for burger selection - NO inner overflow scrollbar!
  const renderBurgerList = (
    currentValue: string,
    onSelect: (name: string) => void
  ) => (
    <div className="space-y-1.5">
      {BURGER_OPTIONS.map((burger, idx) => {
        const isSelected = currentValue === burger.name;
        return (
          <label
            key={`${burger.id}-${idx}`}
            onClick={() => onSelect(burger.name)}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
              isSelected
                ? 'bg-zinc-900 border-[#f5a623]'
                : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
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
              <span className="font-normal text-sm sm:text-base text-white truncate">
                {burger.name}
              </span>
            </div>
            {burger.extraPrice > 0 && (
              <span className="font-semibold text-xs sm:text-sm text-zinc-300 shrink-0 ml-2">
                +{formatPrice(burger.extraPrice)}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );

  // Helper render for side selection - NO inner overflow scrollbar!
  const renderSideList = (
    currentValue: string,
    onSelect: (name: string) => void
  ) => (
    <div className="space-y-1.5">
      {SIDE_OPTIONS.map((side, idx) => {
        const isSelected = currentValue === side;
        return (
          <label
            key={`${side}-${idx}`}
            onClick={() => onSelect(side)}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
              isSelected
                ? 'bg-zinc-900 border-[#f5a623]'
                : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
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
              <span className="font-normal text-sm sm:text-base text-white truncate">
                {side}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {/* Outer wrapper: clicking on backdrop or side of screen closes popup */}
      <div
        key="familyplatter-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        {/* Modal Window: stops propagation so inside clicks don't close */}
        <motion.div
          key="familyplatter-modal-dialog"
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
                onClick={() => setStep((s) => s - 1)}
                className="p-1 -ml-1 text-white hover:text-gray-300 transition-colors cursor-pointer"
                aria-label="Previous step"
              >
                <ArrowLeft size={22} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            <h1 className="font-semibold text-base sm:text-lg text-white tracking-tight truncate max-w-[280px]">
              Family Platter
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
            {/* Slide transition from right side when advancing */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`family-step-${step}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* STEP 1: Choice of 1st Burger */}
                {step === 1 && (
                  <div className="space-y-4">
                    <ItemImageBanner image={item.image || item.heroImage} name={item.name} />
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 1st Burger - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderBurgerList(selectedBurger1, setSelectedBurger1)}
                  </div>
                )}

                {/* STEP 2: Choice of 2nd Burger */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 2nd Burger - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderBurgerList(selectedBurger2, setSelectedBurger2)}
                  </div>
                )}

                {/* STEP 3: Choice of 3rd Burger */}
                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 3rd Burger - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderBurgerList(selectedBurger3, setSelectedBurger3)}
                  </div>
                )}

                {/* STEP 4: Choice of 4th Burger */}
                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 4th Burger - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderBurgerList(selectedBurger4, setSelectedBurger4)}
                  </div>
                )}

                {/* STEP 5: Extras - Burgers - Choose up to 3 */}
                {step === 5 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Extras - Burgers - Choose up to 3
                    </h2>
                    <div className="space-y-2">
                      {EXTRA_OPTIONS.map((extra, idx) => {
                        const isChecked = selectedExtras.includes(extra.name);
                        return (
                          <label
                            key={`${extra.id}-${idx}`}
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
                  </div>
                )}

                {/* STEP 6: Peri Peri Flavours */}
                {step === 6 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Peri Peri Flavours - Peri Peri Chicken - Family Platter - Family Platter - Choose one
                    </h2>
                    <div className="space-y-1.5">
                      {PERI_PERI_FLAVOURS.map((flavour, idx) => {
                        const isSelected = selectedPeriFlavour === flavour;
                        return (
                          <label
                            key={`${flavour}-${idx}`}
                            onClick={() => setSelectedPeriFlavour(flavour)}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-zinc-900 border-[#f5a623]'
                                : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
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
                              <span className="font-normal text-sm sm:text-base text-white truncate">
                                {flavour}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 7: 1st Side */}
                {step === 7 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 1st Side - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderSideList(selectedSide1, setSelectedSide1)}
                  </div>
                )}

                {/* STEP 8: 2nd Side */}
                {step === 8 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 2nd Side - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderSideList(selectedSide2, setSelectedSide2)}
                  </div>
                )}

                {/* STEP 9: 3rd Side */}
                {step === 9 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 3rd Side - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderSideList(selectedSide3, setSelectedSide3)}
                  </div>
                )}

                {/* STEP 10: 4th Side */}
                {step === 10 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Choice of 4th Side - Family Platter - Family Platter - Choose one
                    </h2>
                    {renderSideList(selectedSide4, setSelectedSide4)}
                  </div>
                )}

                {/* STEP 11: Bottle of Drink */}
                {step === 11 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Bottle of Drink - Family Platter - Family Platter - Choose one
                    </h2>
                    <div className="space-y-1.5">
                      {DRINK_OPTIONS.map((drink, idx) => {
                        const isSelected = selectedDrink === drink;
                        return (
                          <label
                            key={`${drink}-${idx}`}
                            onClick={() => setSelectedDrink(drink)}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-zinc-900 border-[#f5a623]'
                                : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
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
                              <span className="font-normal text-sm sm:text-base text-white truncate">
                                {drink}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 12: Final Summary Review & Quantity Stepper */}
                {step === 12 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Summary
                    </h3>
                    <div className="space-y-2 pt-1 text-sm">
                      <div className="flex justify-between items-center text-base font-semibold">
                        <span className="text-white">Family Platter</span>
                        <span className="text-white">
                          {formatPrice(basePrice + burgersExtraTotal)}
                        </span>
                      </div>
                      <div className="text-zinc-300 pl-1">1st: {selectedBurger1}</div>
                      <div className="text-zinc-300 pl-1">2nd: {selectedBurger2}</div>
                      <div className="text-zinc-300 pl-1">3rd: {selectedBurger3}</div>
                      <div className="text-zinc-300 pl-1">4th: {selectedBurger4}</div>

                      {selectedExtras.map((extraName, idx) => {
                        const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                        return (
                          <div
                            key={`${extraName}-${idx}`}
                            className="flex justify-between items-center text-xs sm:text-sm text-zinc-300 pl-1 pt-1 border-t border-zinc-800/60"
                          >
                            <span>{extraName}</span>
                            <span>+{formatPrice(ext?.price || 0)}</span>
                          </div>
                        );
                      })}

                      <div className="text-zinc-300 pl-1 pt-1 border-t border-zinc-800/60">
                        <span className="text-zinc-400">Peri Peri Chicken:</span> {selectedPeriFlavour}
                      </div>

                      <div className="text-zinc-300 pl-1 pt-1 border-t border-zinc-800/60">
                        <span className="text-zinc-400">Sides:</span> {selectedSide1}, {selectedSide2}, {selectedSide3}, {selectedSide4}
                      </div>

                      <div className="text-zinc-300 pl-1 pt-1 border-t border-zinc-800/60">
                        <span className="text-zinc-400">Drink:</span> {selectedDrink}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Shared Summary Drawer on Steps 2 to 11 */}
            {step >= 2 && step <= 11 && (
              <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                <div className="flex justify-between items-center font-medium">
                  <span className="text-white">Family Platter</span>
                  <span className="font-semibold text-white">
                    {formatPrice(basePrice + burgersExtraTotal)}
                  </span>
                </div>
                {step >= 2 && (
                  <div className="text-zinc-300 pl-1">{selectedBurger1}</div>
                )}
                {step >= 3 && (
                  <div className="text-zinc-300 pl-1">{selectedBurger2}</div>
                )}
                {step >= 4 && (
                  <div className="text-zinc-300 pl-1">{selectedBurger3}</div>
                )}
                {step >= 5 && (
                  <div className="text-zinc-300 pl-1">{selectedBurger4}</div>
                )}
                {selectedExtras.map((extraName, idx) => {
                  const ext = EXTRA_OPTIONS.find((e) => e.name === extraName);
                  return (
                    <div
                      key={`sum-extra-${extraName}-${idx}`}
                      className="flex justify-between items-center text-xs text-zinc-300 pl-1"
                    >
                      <span>{extraName}</span>
                      <span>+{formatPrice(ext?.price || 0)}</span>
                    </div>
                  );
                })}
                {step >= 7 && (
                  <div className="text-zinc-300 pl-1">{selectedPeriFlavour}</div>
                )}
                {step >= 8 && (
                  <div className="text-zinc-300 pl-1">{selectedSide1}</div>
                )}
                {step >= 9 && (
                  <div className="text-zinc-300 pl-1">{selectedSide2}</div>
                )}
                {step >= 10 && (
                  <div className="text-zinc-300 pl-1">{selectedSide3}</div>
                )}
                {step >= 11 && (
                  <div className="text-zinc-300 pl-1">{selectedSide4}</div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          {((step >= 1 && step <= 4) || (step >= 6 && step <= 11)) && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
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

          {step === 5 && (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(6)}
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

          {step === 12 && (
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
