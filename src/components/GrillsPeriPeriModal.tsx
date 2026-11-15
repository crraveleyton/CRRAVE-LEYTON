import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface GrillItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface GrillsPeriPeriModalProps {
  isOpen: boolean;
  item: GrillItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const PERI_FLAVOURS = [
  'Hot Peri Peri',
  'Hot, Lemon & Herbs',
  'Lemon & Herbs',
  'Mango & Lime',
  'Mild Peri Peri',
  'Naga Hot',
];

const DONER_HEAT_OPTIONS = ['Normal', 'Spicy'];

const DRINK_OPTIONS = [
  'Coca-Cola',
  'Diet Coke',
  'Coke Zero',
  '7Up',
  'Tango Orange',
  'Capri Sun',
  'Still Water',
];

const SIDE_OPTIONS = [
  'Spicy Rice',
  'Skin On Fries',
  'Peri Salt Fries',
  'Sweet Potato Fries',
  'Coleslaw',
  'Corn on the Cob',
  'Onion Rings',
];

export const GrillsPeriPeriModal: React.FC<GrillsPeriPeriModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  const isDoner = Boolean(
    item?.name?.toLowerCase().includes('doner') ||
      item?.id?.toLowerCase().includes('doner')
  );

  // Step 1: Flavour (or Normal/Spicy for Doner)
  // Step 2: Make it a Meal
  // Step 3: Options (Add 2 Sides / Add 4 Sides / Single)
  // Step 4: Final Summary & Quantity
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedFlavour, setSelectedFlavour] = useState<string>('Hot, Lemon & Herbs');
  const [donerHeat, setDonerHeat] = useState<'Normal' | 'Spicy'>('Normal');
  const [mealOption, setMealOption] = useState<'meal' | 'single'>('single');
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola');
  const [sidesOption, setSidesOption] = useState<'none' | '2sides' | '4sides'>('none');
  const [chosenSides, setChosenSides] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedFlavour('Hot, Lemon & Herbs');
      setDonerHeat('Normal');
      setMealOption('single');
      setSelectedDrink('Coca-Cola');
      setSidesOption('none');
      setChosenSides([]);
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price;
  const mealPrice = mealOption === 'meal' ? 2.0 : 0.0;
  const sidesPrice =
    sidesOption === '2sides' ? 3.5 : sidesOption === '4sides' ? 6.5 : 0.0;

  const singleUnitTotal = basePrice + mealPrice + sidesPrice;
  const grandTotal = singleUnitTotal * quantity;

  const maxSidesAllowed = sidesOption === '2sides' ? 2 : sidesOption === '4sides' ? 4 : 0;

  const handleToggleSide = (side: string) => {
    if (chosenSides.includes(side)) {
      setChosenSides(chosenSides.filter((s) => s !== side));
    } else {
      if (chosenSides.length >= maxSidesAllowed) {
        setChosenSides([...chosenSides.slice(1), side]);
      } else {
        setChosenSides([...chosenSides, side]);
      }
    }
  };

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [];

    if (isDoner) {
      variantParts.push(donerHeat);
    } else {
      variantParts.push(selectedFlavour);
    }

    if (mealOption === 'meal') {
      variantParts.push(`Meal (Chips & ${selectedDrink})`);
    } else {
      variantParts.push('Single');
    }

    if (sidesOption === '2sides') {
      variantParts.push('Add 2 Sides');
    } else if (sidesOption === '4sides') {
      variantParts.push('Add 4 Sides');
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
        key="grillsperiperi-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="grillsperiperi-modal-dialog"
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
                onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
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
            {/* STEP 1: Peri Peri Flavours or Doner Heat */}
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

                {isDoner ? (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Normal or Spicy? – Choose one
                    </h3>

                    <div className="space-y-2.5">
                      {DONER_HEAT_OPTIONS.map((heat, hIdx) => {
                        const isSelected = donerHeat === heat;
                        return (
                          <label
                            key={`${heat}-${hIdx}`}
                            onClick={() => setDonerHeat(heat as any)}
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
                                {heat}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Peri Peri Flavours – Choose one
                    </h3>

                    <div className="space-y-2.5">
                      {PERI_FLAVOURS.map((flavour, fIdx) => {
                        const isSelected = selectedFlavour === flavour;
                        return (
                          <label
                            key={`${flavour}-${fIdx}`}
                            onClick={() => setSelectedFlavour(flavour)}
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
                                {flavour}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: MAKE IT A MEAL */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Make it a Meal – Choose one
                  </h3>
                </div>

                <div className="space-y-2.5">
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
                        Make it a Meal (Chips & Drink)
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-zinc-300">
                      +£2.00
                    </span>
                  </label>

                  {mealOption === 'meal' && (
                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                      <span className="text-xs font-semibold text-zinc-400 block">
                        Included Can of Drink:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DRINK_OPTIONS.map((drink, dIdx) => (
                          <button
                            key={`${drink}-${dIdx}`}
                            type="button"
                            onClick={() => setSelectedDrink(drink)}
                            className={cn(
                              'p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border',
                              selectedDrink === drink
                                ? 'bg-[#f5a623] text-black border-[#f5a623] font-bold'
                                : 'bg-black text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                            )}
                          >
                            {drink}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">
                    {isDoner ? donerHeat : selectedFlavour}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OPTIONS (SIDES) */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Add Sides – Choose one
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <label
                    onClick={() => setSidesOption('none')}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      sidesOption === 'none'
                        ? 'bg-zinc-900 border-[#f5a623]'
                        : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          sidesOption === 'none'
                            ? 'border-[#f5a623] bg-[#f5a623]'
                            : 'border-zinc-500 bg-transparent'
                        )}
                      >
                        {sidesOption === 'none' && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </div>
                      <span className="font-normal text-sm sm:text-base text-white">
                        No Extra Sides
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setSidesOption('2sides')}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      sidesOption === '2sides'
                        ? 'bg-zinc-900 border-[#f5a623]'
                        : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          sidesOption === '2sides'
                            ? 'border-[#f5a623] bg-[#f5a623]'
                            : 'border-zinc-500 bg-transparent'
                        )}
                      >
                        {sidesOption === '2sides' && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </div>
                      <span className="font-normal text-sm sm:text-base text-white">
                        Add 2 Sides
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-zinc-300">
                      +£3.50
                    </span>
                  </label>

                  <label
                    onClick={() => setSidesOption('4sides')}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      sidesOption === '4sides'
                        ? 'bg-zinc-900 border-[#f5a623]'
                        : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          sidesOption === '4sides'
                            ? 'border-[#f5a623] bg-[#f5a623]'
                            : 'border-zinc-500 bg-transparent'
                        )}
                      >
                        {sidesOption === '4sides' && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </div>
                      <span className="font-normal text-sm sm:text-base text-white">
                        Add 4 Sides
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-zinc-300">
                      +£6.50
                    </span>
                  </label>
                </div>

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">
                    {isDoner ? donerHeat : selectedFlavour}
                  </div>
                  {mealOption === 'meal' && (
                    <div className="text-zinc-300 pl-1">
                      Meal (+£2.00) - {selectedDrink}
                    </div>
                  )}
                  {sidesOption === '2sides' && (
                    <div className="text-zinc-300 pl-1">
                      Add 2 Sides (+£3.50)
                    </div>
                  )}
                  {sidesOption === '4sides' && (
                    <div className="text-zinc-300 pl-1">
                      Add 4 Sides (+£6.50)
                    </div>
                  )}
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

                <div className="space-y-2.5 pt-1 text-sm">
                  <div className="flex justify-between items-center text-base font-semibold">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">
                    {isDoner ? `Heat: ${donerHeat}` : `Flavour: ${selectedFlavour}`}
                  </div>

                  {mealOption === 'meal' && (
                    <div className="flex justify-between items-center text-zinc-300 pl-1">
                      <span>Meal (Chips & {selectedDrink})</span>
                      <span className="font-semibold text-white">+£2.00</span>
                    </div>
                  )}

                  {sidesOption === '2sides' && (
                    <div className="flex justify-between items-center text-zinc-300 pl-1">
                      <span>Add 2 Sides</span>
                      <span className="font-semibold text-white">+£3.50</span>
                    </div>
                  )}
                  {sidesOption === '4sides' && (
                    <div className="flex justify-between items-center text-zinc-300 pl-1">
                      <span>Add 4 Sides</span>
                      <span className="font-semibold text-white">+£6.50</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {step < 4 ? (
            <div className="border-t border-zinc-900 bg-[#000000] px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep((s) => ((s + 1) as any))}
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
          ) : (
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
