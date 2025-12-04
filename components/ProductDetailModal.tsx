import React, { useState } from 'react';
import { Product } from '../types';
import { BomParser } from './BomParser';
import { LazyImage } from './LazyImage';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onPurchase: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onPurchase }) => {
  const [activeTab, setActiveTab] = useState<'concept' | 'cad'>('concept');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchaseClick = () => {
    setIsPurchasing(true);
    // Simulate API call
    setTimeout(() => {
      setIsPurchasing(false);
      onPurchase(product);
    }, 1500);
  };

  // Convert legacy array materials to string if necessary
  const materialsString = Array.isArray(product.materials) ? product.materials.join('\n') : (product.materials || '');
  
  const currentImage = activeTab === 'concept' ? product.imageUrl : product.cadImageUrl;
  const imageSrc = currentImage?.startsWith('http') ? currentImage : `data:image/png;base64,${currentImage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full max-w-6xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] animate-fade-in-up">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md border border-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Visual Column */}
        <div className="w-full md:w-3/5 bg-slate-950 relative flex flex-col h-1/2 md:h-full">
          <div className="absolute top-6 left-6 z-10 flex gap-2">
             <button 
               onClick={() => setActiveTab('concept')}
               className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border transition-all ${activeTab === 'concept' ? 'bg-indigo-600/90 border-indigo-500/50 text-white shadow-lg' : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'}`}
             >
               Concept
             </button>
             {product.cadImageUrl && (
               <button 
                 onClick={() => setActiveTab('cad')}
                 className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border transition-all ${activeTab === 'cad' ? 'bg-emerald-600/90 border-emerald-500/50 text-white shadow-lg' : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'}`}
               >
                 Engineering
               </button>
             )}
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]">
             {imageSrc && (
                <LazyImage 
                   src={imageSrc} 
                   alt={product.name}
                   className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-500"
                   containerClassName="w-full h-full flex items-center justify-center"
                />
             )}
          </div>
        </div>

        {/* Details Column */}
        <div className="w-full md:w-2/5 flex flex-col bg-slate-900 border-l border-slate-800 h-1/2 md:h-full">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">{product.name}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-400 mb-6">
                  <span className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-md border border-indigo-500/20 font-bold text-xs uppercase tracking-wide">Ready-to-Wear</span>
                  <span className="text-slate-600">•</span>
                  <span className={product.creator === 'You' ? 'text-indigo-400 font-bold' : ''}>Designed by {product.creator}</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-light text-base">
                  {product.description}
                </p>
              </div>

              {materialsString && (
                <div className="mb-8 p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     Materials Included
                   </h3>
                   <BomParser markdown={materialsString} />
                </div>
              )}
          </div>

          <div className="p-8 md:p-10 border-t border-slate-800 bg-slate-900 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
             <div className="flex justify-between items-end mb-6">
                <span className="text-sm text-slate-400 font-medium">Commercial License</span>
                <span className="text-4xl font-bold text-white tracking-tight">${product.price}</span>
             </div>
             
             <button 
               onClick={handlePurchaseClick}
               disabled={isPurchasing}
               className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait transform active:scale-[0.99]"
             >
               {isPurchasing ? (
                 <>
                   <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                   Processing Transaction...
                 </>
               ) : (
                 <>
                   Purchase Design Pack
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 </>
               )}
             </button>
             <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-wide font-medium">
               Includes high-res PNG • Vector CAD • Full BOM
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};