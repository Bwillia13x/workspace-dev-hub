import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductDetailModal } from './ProductDetailModal';
import { LazyImage } from './LazyImage';

interface MarketplaceProps {
  products: Product[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'likes';

export const Marketplace: React.FC<MarketplaceProps> = ({ products, onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // Local state to handle likes for interactivity
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());

  const handlePurchase = (product: Product) => {
    onShowToast('success', `License purchased for "${product.name}"`);
    setSelectedProduct(null);
  };

  const toggleLike = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const newLiked = new Set(likedProducts);
    if (newLiked.has(productId)) {
        newLiked.delete(productId);
    } else {
        newLiked.add(productId);
        onShowToast('info', 'Added to favorites');
    }
    setLikedProducts(newLiked);
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterMode === 'all' ? true : p.creator === 'You';
      return matchesSearch && matchesFilter;
    });

    // Sort logic
    result.sort((a, b) => {
        switch (sortOption) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'likes': return b.likes - a.likes;
            case 'newest': 
            default:
                return parseInt(b.id) - parseInt(a.id);
        }
    });

    return result;
  }, [products, searchTerm, filterMode, sortOption]);

  return (
    <div className="bg-[#02040a] min-h-full pb-32">
      
      {/* Product Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onPurchase={handlePurchase}
        />
      )}

      {/* Hero Header */}
      <div className="relative bg-[#02040a] border-b border-white/5 py-24 px-6 overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
            <div className="absolute -top-[50%] -left-[20%] w-[80%] h-[200%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen"></div>
            <div className="absolute top-[20%] -right-[20%] w-[60%] h-[150%] bg-purple-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
         </div>

         <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-[0.2em] mb-8 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              Global Ecosystem
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight leading-none drop-shadow-2xl">
              Curated <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">AI Fashion</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed mb-12">
              Explore, license, and manufacture production-ready designs created by the NanoFashion community.
            </p>
            
            <div className="max-w-xl mx-auto flex flex-col gap-8">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
                    <input 
                        type="text" 
                        placeholder="Search collection..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="relative w-full bg-[#0B0F19] border border-white/10 rounded-full py-4 px-8 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-2xl transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-400 border border-white/5 hover:text-white transition-colors cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex justify-center gap-2 bg-[#0B0F19] p-1 rounded-xl border border-white/5 backdrop-blur-sm shadow-lg">
                    <button 
                      onClick={() => setFilterMode('all')}
                      className={`text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-all ${filterMode === 'all' ? 'text-white bg-[#1e293b] shadow-md border border-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      Discover
                    </button>
                    <button 
                      onClick={() => setFilterMode('mine')}
                      className={`text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-all ${filterMode === 'mine' ? 'text-white bg-[#1e293b] shadow-md border border-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      My Designs
                    </button>
                  </div>
                </div>
            </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-[1600px] mx-auto px-6 mb-6 flex justify-end z-20 relative -mt-4">
          <div className="relative group">
              <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="appearance-none bg-[#0B0F19] border border-white/10 text-xs text-slate-400 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-indigo-500/50 hover:bg-slate-800/50 transition-colors font-medium cursor-pointer"
              >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="likes">Most Liked</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
      </div>

      {/* Grid Content */}
      <div className="max-w-[1600px] mx-auto px-6 relative z-20">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-[#0B0F19]/80 rounded-3xl border border-white/5 border-dashed backdrop-blur-sm">
            {products.length === 0 || (filterMode === 'mine' && products.every(p => p.creator !== 'You')) ? (
               <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
                     <span className="text-2xl opacity-50">{filterMode === 'mine' ? '🎨' : '🌱'}</span>
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2">No designs yet</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
                    {filterMode === 'mine' ? "You haven't published any designs yet." : "The marketplace is empty."}
                  </p>
                  {filterMode === 'mine' && (
                      <p className="text-slate-500 text-xs font-mono">Head to Studio to create.</p>
                  )}
               </div>
            ) : (
               <p className="text-slate-400 text-lg">No designs found matching "{searchTerm}".</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product, index) => {
              const isLiked = likedProducts.has(product.id);
              const displayLikes = product.likes + (isLiked ? 1 : 0);
              
              return (
              <div 
                key={product.id} 
                className="bg-[#0B0F19] rounded-xl overflow-hidden border border-white/5 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 group flex flex-col cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black">
                  <LazyImage 
                    src={product.imageUrl.startsWith('http') ? product.imageUrl : `data:image/png;base64,${product.imageUrl}`} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    containerClassName="w-full h-full"
                  />
                  {/* Like Button */}
                  <button 
                    onClick={(e) => toggleLike(e, product.id)}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center transition-all group/like active:scale-90"
                  >
                     <svg className={`w-4 h-4 transition-colors ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                     </svg>
                  </button>

                  {product.cadImageUrl && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-sm border border-white/10 flex items-center gap-1.5 uppercase tracking-wide z-20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                      CAD
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6 z-10">
                    <span className="w-full text-center bg-white text-black py-3 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 transition-colors transform translate-y-4 group-hover:translate-y-0 duration-300">
                      View Details
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                     <h3 className="font-bold text-base text-slate-100 leading-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                     <span className="text-sm font-bold text-emerald-400 font-mono">${product.price}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                     <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border border-white/10 block ${product.creator === 'You' ? 'bg-indigo-500' : 'bg-slate-800'} shadow-sm`}></span>
                        <span className={product.creator === 'You' ? 'text-indigo-400 font-bold' : 'text-slate-500'}>{product.creator}</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                        <span>{displayLikes}</span>
                     </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       {product.materials && product.materials.length > 0 && (
                          <div className="flex -space-x-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-black flex items-center justify-center text-[7px] text-slate-400 font-mono shadow-sm z-10">BOM</div>
                            <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-black flex items-center justify-center text-[7px] text-slate-400 font-mono shadow-sm">CAD</div>
                          </div>
                       )}
                       <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider ml-auto">Commercial Rights</span>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};