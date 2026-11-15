import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface LoadedFriesItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface LoadedFriesModalProps {
  isOpen: boolean;
  item: LoadedFriesItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const SAUCE_CHOICES = [
  'Burger Sauce',
  'Garlic Mayo',
  'Chilli Sauce',
  'Mayonnaise',
  'House Sauce',
];

const PROTEIN_CHOICES = [
  'Crispy Chicken',
  'Beef',
  'Grilled Chicken',
];

export const LoadedFriesModal: React.FC<LoadedFriesModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  // Step 1: Choice of Sauce
  // Step 2: Choice of Protein
  // Step 3: Summary & Add to basket
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSauce, setSelectedSauce] = useState<string>('Burger Sauce');
  const [selectedProtein, setSelectedProtein] = useState<string>('Crispy Chicken');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSauce('Burger Sauce');
      setSelectedProtein('Crispy Chicken');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 6.95;
  const singleUnitTotal = basePrice;
  const grandTotal = singleUnitTotal * quantity;

  const handleFinishAndAdd = () => {
    onAddToCart({
      id: item.id,
      name: item.name,
      price: singleUnitTotal,
      variant: `${selectedSauce} | ${selectedProtein}`,
      quantity,
    });
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="loadedfries-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="loadedfries-modal-dialog"
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
            {/* STEP 1: CHOICE OF SAUCE */}
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
                    Choice of Sauce – {item.name} – Choose one
                  </h3>

                  <div className="space-y-2.5">
                    {SAUCE_CHOICES.map((sauce, sIdx) => (
                      <label
                        key={`${sauce}-${sIdx}`}
                        onClick={() => setSelectedSauce(sauce)}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                          selectedSauce === sauce
                            ? 'bg-zinc-900 border-[#f5a623]'
                            : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                        )}
                      >
                        <span className="font-normal text-sm sm:text-base text-white">
                          {sauce}
                        </span>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                            selectedSauce === sauce
                              ? 'border-[#f5a623] bg-[#f5a623]'
                              : 'border-zinc-500 bg-transparent'
                          )}
                        >
                          {selectedSauce === sauce && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOICE OF PROTEIN */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Choice of Protein – {item.name} – Choose one
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {PROTEIN_CHOICES.map((protein, pIdx) => (
                    <label
                      key={`${protein}-${pIdx}`}
                      onClick={() => setSelectedProtein(protein)}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                        selectedProtein === protein
                          ? 'bg-zinc-900 border-[#f5a623]'
                          : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <span className="font-normal text-sm sm:text-base text-white">
                        {protein}
                      </span>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          selectedProtein === protein
                            ? 'border-[#f5a623] bg-[#f5a623]'
                            : 'border-zinc-500 bg-transparent'
                        )}
                      >
                        {selectedProtein === protein && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1">{selectedSauce}</div>
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
                  <div className="text-zinc-300 pl-1">{selectedSauce}</div>
                  <div className="text-zinc-300 pl-1">{selectedProtein}</div>
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
