import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
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
  const [selectedKidsDrink, setSelectedKidsDrink] = useState<'Fruit Shoot' | 'Capri Sun' | 'Water'>('Fruit Shoot');
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
    } else if (type === 'loaded-fries' || type === 'cheese-fries-tots') {
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
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#141414] shrink-0">
            <h1 className="font-semibold text-base sm:text-lg text-white tracking-tight truncate max-w-[280px]">
              {item.name}
            </h1>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* If SPECIAL RICE BOX, show only Summary like the end of every dish adding */}
            {item.category === 'SPECIAL RICE BOX' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Summary
                  </h3>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-base font-medium">
                    <span className="text-white font-semibold">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatPrice(unitPrice)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Optional Image */}
                {item.image && (
                  <div className="w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80">
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

                {/* Title & Description */}
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
              </>
            )}

            {/* Dynamic Options based on customizationType */}
            {/* 1. Shake / Mojito Size */}
            {(type === 'shake-size' || type === 'mojito-size') && (
              <div className="space-y-3 pt-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Choose Size
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setSelectedSize('Regular')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                      selectedSize === 'Regular'
                        ? 'bg-zinc-800/80 border-[#f5a623]'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    )}
                  >
                    <span className="font-semibold text-sm text-white">Regular</span>
                    <span className="font-bold text-sm text-zinc-300">£3.95</span>
                  </label>
                  <label
                    onClick={() => setSelectedSize('Large')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                      selectedSize === 'Large'
                        ? 'bg-zinc-800/80 border-[#f5a623]'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    )}
                  >
                    <span className="font-semibold text-sm text-white">Large</span>
                    <span className="font-bold text-sm text-zinc-300">£4.50</span>
                  </label>
                </div>
              </div>
            )}

            {/* 2. Wings / Strips / Rice Flavours */}
            {(type === 'wings-flavour' ||
              type === 'strips-flavour' ||
              type === 'peri-peri-rice') && (
              <div className="space-y-3 pt-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Choose Flavour
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(type === 'wings-flavour'
                    ? WINGS_FLAVOURS
                    : type === 'strips-flavour'
                    ? STRIPS_FLAVOURS
                    : PERI_PERI_FLAVOURS
                  ).map((flv) => (
                    <button
                      key={flv}
                      type="button"
                      onClick={() => setSelectedFlavour(flv)}
                      className={cn(
                        'py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                        selectedFlavour === flv
                          ? 'bg-[#f5a623] text-black border-[#f5a623]'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      )}
                    >
                      {flv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Side Upgrade Option for Wings/Strips/Sandwich */}
            {(type === 'wings-flavour' ||
              type === 'strips-flavour' ||
              type === 'toasted-sandwich') && (
              <div className="space-y-3 pt-1 border-t border-zinc-800/80">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Add Side (+£2.00)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'No Side' },
                    { id: 'fries', label: 'Skin-On Fries' },
                    { id: 'rice', label: 'Spicy Rice' },
                  ].map((side) => (
                    <button
                      key={side.id}
                      type="button"
                      onClick={() => setSelectedSideUpgrade(side.id as any)}
                      className={cn(
                        'py-3 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                        selectedSideUpgrade === side.id
                          ? 'bg-[#f5a623] text-black border-[#f5a623]'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      )}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Wrap Options */}
            {(type === 'wrap-sauce' || type === 'wrap-doner') && (
              <div className="space-y-4 pt-1">
                {type === 'wrap-doner' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Select Meat
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['Chicken Doner', 'Meat Doner'].map((meat) => (
                        <button
                          key={meat}
                          type="button"
                          onClick={() => setSelectedDonerMeat(meat as any)}
                          className={cn(
                            'py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                            selectedDonerMeat === meat
                              ? 'bg-[#f5a623] text-black border-[#f5a623]'
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          )}
                        >
                          {meat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Sauce
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WRAP_SAUCE_OPTIONS.map((sauce) => (
                      <button
                        key={sauce}
                        type="button"
                        onClick={() => setSelectedWrapSauce(sauce)}
                        className={cn(
                          'py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          selectedWrapSauce === sauce
                            ? 'bg-[#f5a623] text-black border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        {sauce}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Loaded Fries / Tots */}
            {(type === 'loaded-fries' || type === 'cheese-fries-tots') && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Base
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Skin On Fries', 'Potato Tots'].map((base) => (
                      <button
                        key={base}
                        type="button"
                        onClick={() => setSelectedLoadedBase(base as any)}
                        className={cn(
                          'py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          selectedLoadedBase === base
                            ? 'bg-[#f5a623] text-black border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        {base}
                      </button>
                    ))}
                  </div>
                </div>

                {type === 'loaded-fries' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Select Topping
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {['Grilled Chicken', 'Beef', 'Crispy Chicken'].map((meat) => (
                        <button
                          key={meat}
                          type="button"
                          onClick={() => setSelectedLoadedMeat(meat as any)}
                          className={cn(
                            'py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                            selectedLoadedMeat === meat
                              ? 'bg-[#f5a623] text-black border-[#f5a623]'
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          )}
                        >
                          {meat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Kids Meal */}
            {type === 'kids-meal' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Main
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['4 Nuggets', 'Mini Cheeseburger', 'Mini Chicken Burger'].map((main) => (
                      <button
                        key={main}
                        type="button"
                        onClick={() => setSelectedKidsMain(main as any)}
                        className={cn(
                          'py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          selectedKidsMain === main
                            ? 'bg-[#f5a623] text-black border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        {main}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Drink
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['Fruit Shoot', 'Capri Sun', 'Water'].map((drink) => (
                      <button
                        key={drink}
                        type="button"
                        onClick={() => setSelectedKidsDrink(drink as any)}
                        className={cn(
                          'py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          selectedKidsDrink === drink
                            ? 'bg-[#f5a623] text-black border-[#f5a623]'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        {drink}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Review Box for items with options */}
            {item.category !== 'SPECIAL RICE BOX' && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-white font-semibold">{item.name}</span>
                  <span className="font-bold text-white">{formatPrice(unitPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="border-t border-zinc-800 bg-[#141414] px-5 py-4 shrink-0 flex items-center gap-3">
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
