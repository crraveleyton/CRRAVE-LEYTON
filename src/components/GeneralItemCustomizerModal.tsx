import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { ItemImageBanner } from './ItemImageBanner';
import {
  SOFT_DRINK_CHOICES,
  PERI_PERI_FLAVOURS,
  WINGS_FLAVOURS,
  STRIPS_FLAVOURS,
  WRAP_SAUCE_OPTIONS,
} from '../data/crraveMenuData';

export interface GeneralCustomizerItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  heroImage?: string;
  customizationType?: string;
}

interface GeneralItemCustomizerModalProps {
  isOpen: boolean;
  item: GeneralCustomizerItem | null;
  onClose: () => void;
  onAddToCart: (customized: {
    id: string;
    name: string;
    price: number;
    variant?: string;
    quantity: number;
  }) => void;
}

export const GeneralItemCustomizerModal: React.FC<GeneralItemCustomizerModalProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<'Regular' | 'Large'>('Regular');
  const [selectedFlavour, setSelectedFlavour] = useState<string>('Mild');
  const [selectedSideUpgrade, setSelectedSideUpgrade] = useState<'none' | 'rice' | 'fries'>('none');
  const [selectedSandwichMeat, setSelectedSandwichMeat] = useState<'Chicken' | 'Beef'>('Chicken');
  const [selectedWrapSauce, setSelectedWrapSauce] = useState<string>('House Sauce');
  const [selectedDonerMeat, setSelectedDonerMeat] = useState<'Chicken Doner' | 'Meat Doner'>('Chicken Doner');
  const [selectedLoadedBase, setSelectedLoadedBase] = useState<'Skin On Fries' | 'Potato Tots'>('Skin On Fries');
  const [selectedLoadedMeat, setSelectedLoadedMeat] = useState<'Grilled Chicken' | 'Beef' | 'Crispy Chicken'>('Grilled Chicken');
  const [selectedKidsMain, setSelectedKidsMain] = useState<'4 Nuggets' | 'Mini Cheeseburger' | 'Mini Chicken Burger'>('4 Nuggets');
  const [selectedKidsDrink, setSelectedKidsDrink] = useState<string>('Fruit Shoot');
  const [selectedDrink, setSelectedDrink] = useState<string>('Coca-Cola');
  const [selectedBoxBurger, setSelectedBoxBurger] = useState<string>('Cheeseburger');

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedSize('Regular');
      setSelectedFlavour('Mild');
      setSelectedSideUpgrade('none');
      setSelectedSandwichMeat('Chicken');
      setSelectedWrapSauce('House Sauce');
      setSelectedDonerMeat('Chicken Doner');
      setSelectedLoadedBase('Skin On Fries');
      setSelectedLoadedMeat('Grilled Chicken');
      setSelectedKidsMain('4 Nuggets');
      setSelectedKidsDrink('Fruit Shoot');
      setSelectedDrink('Coca-Cola');
      setSelectedBoxBurger('Cheeseburger');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const type = item.customizationType;

  // Calculate unit price
  let unitPrice = item.price;
  if (type === 'shake-size' || type === 'mojito-size') {
    unitPrice = selectedSize === 'Large' ? 4.5 : 3.95;
  } else if (
    type === 'wings-flavour' ||
    type === 'strips-flavour' ||
    type === 'toasted-sandwich'
  ) {
    if (selectedSideUpgrade !== 'none') unitPrice += 2.0;
  }

  const grandTotal = unitPrice * quantity;

  const handleFinishAndAdd = () => {
    const variantParts: string[] = [];

    if (type === 'shake-size' || type === 'mojito-size') {
      variantParts.push(`Size: ${selectedSize}`);
    } else if (type === 'peri-peri-rice') {
      variantParts.push(`Flavour: ${selectedFlavour}`);
    } else if (type === 'wings-flavour' || type === 'strips-flavour') {
      variantParts.push(`Flavour: ${selectedFlavour}`);
      if (selectedSideUpgrade === 'rice') variantParts.push('With Spicy Rice (+£2.00)');
      if (selectedSideUpgrade === 'fries') variantParts.push('With Skin-On Fries (+£2.00)');
    } else if (type === 'toasted-sandwich') {
      variantParts.push(`Meat: ${selectedSandwichMeat}`);
      if (selectedSideUpgrade === 'rice') variantParts.push('With Spicy Rice (+£2.00)');
      if (selectedSideUpgrade === 'fries') variantParts.push('With Skin-On Fries (+£2.00)');
    } else if (type === 'wrap-sauce' || type === 'wrap-doner') {
      if (type === 'wrap-doner') variantParts.push(`Meat: ${selectedDonerMeat}`);
      variantParts.push(`Sauce: ${selectedWrapSauce}`);
    } else if (type === 'loaded-fries' || type === 'cheese-fries-tots' || type === 'fries-or-tots') {
      variantParts.push(`Base: ${selectedLoadedBase}`);
      if (type === 'loaded-fries') variantParts.push(`Topping: ${selectedLoadedMeat}`);
    } else if (type === 'kids-meal') {
      variantParts.push(`Main: ${selectedKidsMain}`);
      variantParts.push(`Drink: ${selectedKidsDrink}`);
    } else if (type === 'munch-box' || type === 'crrave-box' || type === 'family-platter') {
      variantParts.push(`Burger: ${selectedBoxBurger}`);
      variantParts.push(`Drink: ${selectedDrink}`);
    }

    onAddToCart({
      id: item.id,
      name: item.name,
      price: unitPrice,
      variant: variantParts.length > 0 ? variantParts.join(' | ') : undefined,
      quantity: quantity,
    });
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="generalitem-portal-root"
        className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          key="generalitem-modal-dialog"
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

            {/* If SPECIAL RICE BOX, Masala Fries, Coleslaw, or Simple items */}
            {item.category === 'SPECIAL RICE BOX' ||
            item.name.toLowerCase().includes('masala fries') ||
            item.name.toLowerCase().includes('coleslaw') ||
            !type ? (
              <div className="space-y-4">
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

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(unitPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
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

                {/* Shake / Mojito Size */}
                {(type === 'shake-size' || type === 'mojito-size') && (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Choose Size – Choose one
                    </h3>
                    <div className="space-y-2.5">
                      {(['Regular', 'Large'] as const).map((size, sIdx) => {
                        const price = size === 'Large' ? 4.5 : 3.95;
                        const isSelected = selectedSize === size;
                        return (
                          <label
                            key={`${size}-${sIdx}`}
                            onClick={() => setSelectedSize(size)}
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
                                {size}
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-zinc-300">
                              {formatPrice(price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Peri Peri Rice Flavour */}
                {type === 'peri-peri-rice' && (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Choose Flavour – Choose one
                    </h3>
                    <div className="space-y-2.5">
                      {PERI_PERI_FLAVOURS.map((flavour, fIdx) => {
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

                {/* Wings / Strips Flavour & Side */}
                {(type === 'wings-flavour' || type === 'strips-flavour') && (
                  <>
                    <div className="space-y-3 pt-1">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Choose Flavour – Choose one
                      </h3>
                      <div className="space-y-2.5">
                        {(type === 'wings-flavour' ? WINGS_FLAVOURS : STRIPS_FLAVOURS).map((flavour, fIdx) => {
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

                    <div className="space-y-3 pt-1">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Add a Side
                      </h3>
                      <div className="space-y-2.5">
                        {[
                          { id: 'none', label: 'No Side', extra: 0 },
                          { id: 'rice', label: 'With Spicy Rice', extra: 2.0 },
                          { id: 'fries', label: 'With Skin-On Fries', extra: 2.0 },
                        ].map((opt, oIdx) => {
                          const isSelected = selectedSideUpgrade === opt.id;
                          return (
                            <label
                              key={`${opt.id}-${oIdx}`}
                              onClick={() => setSelectedSideUpgrade(opt.id as any)}
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
                                  {opt.label}
                                </span>
                              </div>
                              {opt.extra > 0 && (
                                <span className="font-semibold text-sm text-zinc-300">
                                  +{formatPrice(opt.extra)}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Kids Meal */}
                {type === 'kids-meal' && (
                  <>
                    <div className="space-y-3 pt-1">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Choose Main – Choose one
                      </h3>
                      <div className="space-y-2.5">
                        {(['4 Nuggets', 'Mini Cheeseburger', 'Mini Chicken Burger'] as const).map((main, mIdx) => {
                          const isSelected = selectedKidsMain === main;
                          return (
                            <label
                              key={`${main}-${mIdx}`}
                              onClick={() => setSelectedKidsMain(main)}
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
                                  {main}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Choose Drink – Choose one
                      </h3>
                      <div className="space-y-2.5">
                        {['Fruit Shoot'].map((drink, dIdx) => {
                          const isSelected = selectedKidsDrink === drink;
                          return (
                            <label
                              key={`${drink}-${dIdx}`}
                              onClick={() => setSelectedKidsDrink(drink)}
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
                                  {drink}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-[#262626] rounded-xl p-4 space-y-1.5 text-xs sm:text-sm mt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Summary</h4>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(unitPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
