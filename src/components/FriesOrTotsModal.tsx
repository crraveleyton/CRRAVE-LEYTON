import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';

export interface FriesOrTotsItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
}

interface FriesOrTotsModalProps {
  isOpen: boolean;
  item: FriesOrTotsItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant: string;
    quantity: number;
  }) => void;
}

const BASE_CHOICES = ['Fries', 'Tots'];

export const FriesOrTotsModal: React.FC<FriesOrTotsModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'Fries' | 'Tots'>('Fries');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setSelectedChoice('Fries');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 4.95;
  const grandTotal = basePrice * quantity;

  const handleFinishAndAdd = () => {
    onAddToCart({
      id: item.id,
      name: item.name,
      price: basePrice,
      variant: selectedChoice,
      quantity,
    });
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="friesortots-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="friesortots-modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#000000] text-white sm:rounded-2xl shadow-2xl border border-zinc-800 flex flex-col max-h-[100dvh] sm:max-h-[90vh] overflow-hidden z-10"
        >
          {/* Top Bar - explicitly sticky, highest z-index inside modal */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-[#000000] shrink-0">
            <div className="w-6" />
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
                Fries or Tots? – Choose one
              </h3>

              <div className="space-y-2.5">
                {BASE_CHOICES.map((choice, cIdx) => (
                  <label
                    key={`${choice}-${cIdx}`}
                    onClick={() => setSelectedChoice(choice as any)}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      selectedChoice === choice
                        ? 'bg-zinc-900 border-[#f5a623]'
                        : 'bg-black border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          selectedChoice === choice
                            ? 'border-[#f5a623] bg-[#f5a623]'
                            : 'border-zinc-500 bg-transparent'
                        )}
                      >
                        {selectedChoice === choice && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </div>
                      <span className="font-normal text-sm sm:text-base text-white">
                        {choice}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
              <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
              <div className="flex justify-between items-center font-medium">
                <span className="text-white">{item.name}</span>
                <span className="font-semibold text-white">
                  {formatPrice(basePrice)}
                </span>
              </div>
              <div className="text-zinc-300 pl-1">{selectedChoice}</div>
            </div>
          </div>

          {/* Bottom Bar: Stepper & Add to Basket */}
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
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
