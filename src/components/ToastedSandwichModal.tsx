import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';

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

const MEAT_OPTIONS = ['Chicken', 'Beef (two patties)'];

interface SideOption {
  id: 'single' | 'fries' | 'rice';
  label: string;
  price: number;
}

const SIDE_OPTIONS: SideOption[] = [
  { id: 'single', label: 'Single', price: 0 },
  { id: 'fries', label: 'Add Fries', price: 2.0 },
  { id: 'rice', label: 'Add Spicy Rice', price: 2.0 },
];

export const ToastedSandwichModal: React.FC<ToastedSandwichModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Meat (Chicken or Beef (two patties))
  // Step 2: Options (Single, Add Fries £2.00, Add Spicy Rice £2.00)
  // Step 3: Summary Review & Quantity
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedMeat, setSelectedMeat] = useState<string>('Chicken');
  const [selectedOption, setSelectedOption] = useState<SideOption>(SIDE_OPTIONS[0]);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMeat('Chicken');
      setSelectedOption(SIDE_OPTIONS[0]);
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 6.50;
  const singleUnitTotal = basePrice + selectedOption.price;
  const grandTotal = singleUnitTotal * quantity;

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [selectedMeat];

    if (selectedOption.id !== 'single') {
      variantParts.push(`${selectedOption.label} (+${formatPrice(selectedOption.price)})`);
    } else {
      variantParts.push('Single');
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
            {/* STEP 1: CHOOSE YOUR MEAT */}
            {step === 1 && (
              <div>
                {item.image && (
                  <div className="w-full h-44 sm:h-52 overflow-hidden bg-zinc-900">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Choose your Meat – Choose one
                    </h3>

                    <div className="space-y-3">
                      {MEAT_OPTIONS.map((meat) => {
                        const isSelected = selectedMeat === meat;
                        return (
                          <label
                            key={meat}
                            onClick={() => {
                              setSelectedMeat(meat);
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
                              {meat}
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

            {/* STEP 2: CHOOSE OPTIONS (SINGLE, ADD FRIES, ADD SPICY RICE) */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Options – Choose one
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Enjoy single or upgrade with fries or spicy rice
                  </p>
                </div>

                <div className="space-y-3">
                  {SIDE_OPTIONS.map((opt) => {
                    const isSelected = selectedOption.id === opt.id;
                    return (
                      <label
                        key={opt.id}
                        onClick={() => {
                          setSelectedOption(opt);
                          setStep(3);
                        }}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                        )}
                      >
                        <span className="font-medium text-base text-white">
                          {opt.label}
                        </span>

                        <div className="flex items-center gap-3">
                          {opt.price > 0 && (
                            <span className="text-sm font-semibold text-zinc-300">
                              +{formatPrice(opt.price)}
                            </span>
                          )}
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
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Summary Section */}
                <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">{selectedMeat}</div>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL SUMMARY REVIEW */}
            {step === 3 && (
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
                  <div className="text-sm text-zinc-300 pl-1">{selectedMeat}</div>
                  <div className="flex justify-between items-center text-sm text-zinc-300 pl-1">
                    <span>{selectedOption.label}</span>
                    {selectedOption.price > 0 && (
                      <span>+{formatPrice(selectedOption.price)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {(step === 1 || step === 2) && (
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
                  {formatPrice(singleUnitTotal)}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
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
