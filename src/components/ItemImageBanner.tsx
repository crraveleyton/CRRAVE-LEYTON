import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, X } from 'lucide-react';

interface ItemImageBannerProps {
  image?: string;
  name: string;
}

export const ItemImageBanner: React.FC<ItemImageBannerProps> = ({ image, name }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!image || typeof image !== 'string' || !image.trim()) {
    return null;
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="relative mb-4 group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-md select-none"
        title="Click to view full photo"
      >
        <img
          src={image}
          alt={name}
          className="w-full h-44 sm:h-52 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2.5">
          <span className="text-[11px] font-semibold bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5 shadow-md">
            <ZoomIn size={13} />
            <span>View photo</span>
          </span>
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-orange-400 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              aria-label="Close full photo"
            >
              <X size={22} />
            </button>
            <img
              src={image}
              alt={name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
            />
            <p className="mt-3 text-sm font-bold text-white text-center">{name}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
