import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

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

  // Selections
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
        // Replace oldest or keep at max
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
      variantParts.push(
        `2 Sides (${chosenSides.length > 0 ? chosenSides.join(', ') : 'Spicy Rice, Fries'})`
      );
    } else if (sidesOption === '4sides') {
      variantParts.push(
        `4 Sides (${chosenSides.length > 0 ? chosenSides.join(', ') : 'Assorted Sides'})`
      );
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
    item.heroImage ||
    item.image ||
    (isDoner
      ? '/assets/grills/chicken_doner.jpg'
      : '/assets/grills/peri_chicken_hero.jpg');

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
          {/* Top Header Bar for Steps 2, 3, 4 */}
          {step > 1 ? (
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#141414] shrink-0">
              <button
                type="button"
                onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
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
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
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
            {/* STEP 1: Peri Peri Flavours or Doner Heat */}
            {step === 1 && (
              <div>
                {/* Hero Image */}
                <div className="w-full h-52 sm:h-64 bg-zinc-900 overflow-hidden relative">
                  <img
                    src={heroImgSrc}
                    alt={item.name}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = isDoner
                        ? '/assets/grills/chicken_doner.jpg'
                        : '/assets/grills/peri_chicken_hero.jpg';
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

                  {/* CHICKEN / LAMB DONER: Normal or Spicy? (Screenshot 1) */}
                  {isDoner ? (
                    <div className="space-y-3 pt-1">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Normal or Spicy? - Choose one
                      </h3>

                      <div className="space-y-2">
                        {DONER_HEAT_OPTIONS.map((heat) => {
                          const isSelected = donerHeat === heat;
                          return (
                            <label
                              key={heat}
                              onClick={() => setDonerHeat(heat as any)}
                              className={cn(
                                'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-zinc-800/80 border-[#f5a623]'
                                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                    isSelected
                                      ? 'border-[#f5a623] bg-[#f5a623]'
                                      : 'border-zinc-500'
                                  )}
                                >
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                  )}
                                </div>
                                <span className="font-semibold text-sm text-white">
                                  {heat}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* GRILL & PERI PERI ITEMS: Peri Peri Flavours (Screenshot 5) */
                    <div className="space-y-3 pt-1">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Peri Peri Flavours - Choose one
                      </h3>

                      <div className="space-y-2">
                        {PERI_FLAVOURS.map((flavour) => {
                          const isSelected = selectedFlavour === flavour;
                          return (
                            <label
                              key={flavour}
                              onClick={() => setSelectedFlavour(flavour)}
                              className={cn(
                                'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-zinc-800/80 border-[#f5a623]'
                                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                    isSelected
                                      ? 'border-[#f5a623] bg-[#f5a623]'
                                      : 'border-zinc-500'
                                  )}
                                >
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                  )}
                                </div>
                                <span className="font-semibold text-sm text-white">
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
              </div>
            )}

            {/* STEP 2: Make it a Meal (Screenshot 4) */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-3">
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

                {/* Summary Box (Screenshot 4) */}
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

                    <div className="flex justify-between items-center text-zinc-300">
                      <span>{isDoner ? donerHeat : selectedFlavour}</span>
                    </div>

                    {mealOption === 'meal' && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Make it a Meal (Drinks & Chips)</span>
                        <span className="font-semibold text-white">
                          +£2.00
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Options - Grills & Peri Peri (Screenshot 3) */}
            {step === 3 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-3">
                    Options - Grills & Peri Peri - Choose one
                  </h3>

                  <div className="space-y-2">
                    {/* Add 2 Sides */}
                    <label
                      onClick={() => {
                        setSidesOption('2sides');
                        if (chosenSides.length > 2) setChosenSides(chosenSides.slice(0, 2));
                      }}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                        sidesOption === '2sides'
                          ? 'bg-zinc-800/80 border-[#f5a623]'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            sidesOption === '2sides'
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500'
                          )}
                        >
                          {sidesOption === '2sides' && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-white">
                          Add 2 Sides
                        </span>
                      </div>
                      <span className="font-bold text-sm text-zinc-300">
                        +£3.50
                      </span>
                    </label>

                    {/* Add 4 Sides */}
                    <label
                      onClick={() => setSidesOption('4sides')}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                        sidesOption === '4sides'
                          ? 'bg-zinc-800/80 border-[#f5a623]'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            sidesOption === '4sides'
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500'
                          )}
                        >
                          {sidesOption === '4sides' && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-white">
                          Add 4 Sides
                        </span>
                      </div>
                      <span className="font-bold text-sm text-zinc-300">
                        +£6.50
                      </span>
                    </label>

                    {/* Single (No extra sides) */}
                    <label
                      onClick={() => {
                        setSidesOption('none');
                        setChosenSides([]);
                      }}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                        sidesOption === 'none'
                          ? 'bg-zinc-800/80 border-[#f5a623]'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            sidesOption === 'none'
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500'
                          )}
                        >
                          {sidesOption === 'none' && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-white">
                          Single
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Sides Picker if 2 or 4 sides are chosen */}
                  {(sidesOption === '2sides' || sidesOption === '4sides') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-4 space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#f5a623] uppercase tracking-wider">
                          Choose {sidesOption === '2sides' ? '2 Sides' : '4 Sides'}:
                        </span>
                        <span className="text-zinc-400">
                          {chosenSides.length} of {maxSidesAllowed} selected
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SIDE_OPTIONS.map((side) => {
                          const isPicked = chosenSides.includes(side);
                          return (
                            <button
                              key={side}
                              type="button"
                              onClick={() => handleToggleSide(side)}
                              className={cn(
                                'py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer',
                                isPicked
                                  ? 'bg-[#f5a623] text-black border-[#f5a623] font-bold shadow-sm'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                              )}
                            >
                              {side}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Summary Box (Screenshot 3) */}
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

                    <div className="flex justify-between items-center text-zinc-300">
                      <span>{isDoner ? donerHeat : selectedFlavour}</span>
                    </div>

                    {mealOption === 'meal' && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Make it a Meal (Drinks & Chips)</span>
                        <span className="font-semibold text-white">
                          +{formatPrice(mealPrice)}
                        </span>
                      </div>
                    )}

                    {sidesOption !== 'none' && (
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>
                          {sidesOption === '2sides' ? 'Add 2 Sides' : 'Add 4 Sides'}
                        </span>
                        <span className="font-semibold text-white">
                          +{formatPrice(sidesPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Final Summary & Add to basket (Screenshot 2) */}
            {step === 4 && (
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

                    <div className="text-sm text-zinc-300 border-t border-zinc-800/60 pt-2.5">
                      <span className="font-medium text-white">
                        {isDoner ? `Heat: ${donerHeat}` : `Flavour: ${selectedFlavour}`}
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

                    {sidesOption !== 'none' && (
                      <div className="flex justify-between items-center text-sm text-zinc-300 border-t border-zinc-800/60 pt-2.5">
                        <div>
                          <span>
                            {sidesOption === '2sides' ? 'Add 2 Sides' : 'Add 4 Sides'}
                          </span>
                          {chosenSides.length > 0 && (
                            <span className="block text-xs text-[#f5a623] mt-0.5">
                              {chosenSides.join(', ')}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-white">
                          +{formatPrice(sidesPrice)}
                        </span>
                      </div>
                    )}

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
            {step < 4 ? (
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep((prev) => ((prev + 1) as any))}
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
            ) : (
              <div className="flex items-center gap-3">
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

                {/* Add to Basket Button */}
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
