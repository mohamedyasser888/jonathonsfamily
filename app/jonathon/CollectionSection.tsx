"use client";

import React, { useState } from "react";
import ProductCard from "./ProductCard";
import type { Product, Collection } from "@/lib/types/profile";

interface CollectionSectionProps {
  collection: Collection;
  products: Product[];
  userId: string;
}

export default function CollectionSection({
  collection,
  products,
  userId,
}: CollectionSectionProps) {
  // Modal gallery state
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Filter products for this collection
  const collectionProducts = products.filter(
    (p) => p.collection_id === collection.id
  );

  function handleNext() {
    if (!collection.images || collection.images.length === 0) return;
    setIsImageLoading(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % collection.images!.length);
  }

  function handlePrev() {
    if (!collection.images || collection.images.length === 0) return;
    setIsImageLoading(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + collection.images!.length) % collection.images!.length);
  }

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, collection.images]);

  if (collectionProducts.length === 0) {
    return null; // Skip collections with no products to show a clean storefront
  }

  return (
    <section
      id={`collection-${collection.id}`}
      className="space-y-6 scroll-mt-20 animate-fade-in"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-sm" />
            {collection.name}
          </h2>
          {collection.description && (
            <p className="text-sm text-zinc-500 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>

        {collection.images && Array.isArray(collection.images) && collection.images.length > 0 && (
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsImageLoading(true);
              setIsOpen(true);
            }}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/30 text-xs font-bold text-violet-400 transition-all duration-200 active:scale-95 shadow-lg shadow-violet-950/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            View Collection Gallery
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {collectionProducts.map((product) => (
          <div key={product.id} className="h-full">
            <ProductCard product={product} userId={userId} />
          </div>
        ))}
      </div>

      {/* Luxury Gallery Modal Overlay */}
      {isOpen && collection.images && collection.images.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-xl p-4 sm:p-6 md:p-8 animate-fade-in select-none">
          {/* Header Panel */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <div>
              <span className="text-[10px] font-bold text-violet-400 tracking-wider uppercase">
                Collection Showcase
              </span>
              <h3 className="text-base font-black text-white mt-1">
                {collection.name} Gallery
              </h3>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Central Main Viewport */}
          <div className="flex-1 flex items-center justify-between relative max-w-5xl mx-auto w-full my-6 gap-4">
            {/* Left Chevron */}
            <button
              onClick={handlePrev}
              disabled={collection.images.length <= 1}
              className="p-3 rounded-full border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 disabled:opacity-20 text-zinc-400 hover:text-white disabled:pointer-events-none transition-all active:scale-95 shrink-0 z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Display Box */}
            <div className="flex-1 h-full flex flex-col items-center justify-center relative min-w-0">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-violet-400/80">
                  <div className="w-10 h-10 border-3 border-zinc-850 border-t-violet-500 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={collection.images[currentIndex]}
                alt={`Collection item ${currentIndex + 1}`}
                onLoad={() => setIsImageLoading(false)}
                className={`max-w-full max-h-[60vh] md:max-h-[70vh] object-contain rounded-2xl border border-zinc-900/80 shadow-2xl transition-all duration-300 ${
                  isImageLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                }`}
              />
              
              {/* Image Counter Badge */}
              <div className="mt-4 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 text-[11px] font-semibold text-zinc-400">
                {currentIndex + 1} of {collection.images.length}
              </div>
            </div>

            {/* Right Chevron */}
            <button
              onClick={handleNext}
              disabled={collection.images.length <= 1}
              className="p-3 rounded-full border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 disabled:opacity-20 text-zinc-400 hover:text-white disabled:pointer-events-none transition-all active:scale-95 shrink-0 z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Bottom Thumbnails strip filmstrip */}
          {collection.images.length > 1 && (
            <div className="border-t border-zinc-900 pt-6 flex justify-center">
              <div className="flex gap-2.5 overflow-x-auto max-w-full pb-2 scrollbar-none px-4">
                {collection.images.map((imgUrl, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx !== currentIndex) {
                          setIsImageLoading(true);
                          setCurrentIndex(idx);
                        }
                      }}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                        isActive
                          ? "border-violet-500 scale-105 shadow-md shadow-violet-500/20"
                          : "border-zinc-800 hover:border-zinc-700 opacity-60 hover:opacity-90"
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
