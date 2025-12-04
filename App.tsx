
import React, { useState, useEffect } from 'react';
import { Studio } from './components/Studio';
import { Marketplace } from './components/Marketplace';
import { ToastContainer } from './components/Toast';
import { AppView, Product, Notification, NotificationType, DesignDraft } from './types';

// Mock initial data to populate the marketplace
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Neo-Tokyo Ballistic Parka',
    description: 'A high-concept outerwear piece merging traditional kimono silhouettes with modern ballistic nylon. Features waterproof zippers and programmable LED trim.',
    price: 2450,
    imageUrl: 'https://images.unsplash.com/photo-1559582798-678dfc71ccd8?q=80&w=1000&auto=format&fit=crop', 
    cadImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop', 
    materials: [
      '## Bill of Materials',
      '- **Shell**: 1000D Cordura Nylon (Matte Black)',
      '- **Lining**: Heat-reflective foil mesh',
      '- **Hardware**: YKK Aquaguard Zippers, size 8',
      '- **Trim**: EL Wire (Blue) with battery pack integration'
    ],
    creator: 'Kaito_Design',
    likes: 124
  },
  {
    id: '2',
    name: 'Ethereal Silk Struct',
    description: 'Architectural evening wear. Sculpted silk organza layered over a rigid corset structure. Designed for the metadata gala.',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=1000&auto=format&fit=crop',
    materials: [
      '## Bill of Materials',
      '- **Main**: 100% Silk Organza (Iridescent)',
      '- **Structure**: Boning (Steel coil)',
      '- **Inner**: Nude illusion mesh',
      '- **Closure**: Invisible zipper (Center Back)'
    ],
    creator: 'Studio_V',
    likes: 89
  },
  {
    id: '3',
    name: 'Modular Utility Vest',
    description: 'Urban tactical gear suitable for everyday wear. Detachable pockets and magnetic buckles allow for 5 different configurations.',
    price: 850,
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
    materials: [
      '## Bill of Materials',
      '- **Fabric**: Waxed Cotton Canvas (Olive)',
      '- **Webbing**: 2" Nylon seatbelt grade',
      '- **Buckles**: Fidlock V-Buckle (Magnetic)',
      '- **Thread**: Heavy duty bonded nylon'
    ],
    creator: 'TechWear_Global',
    likes: 215
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.STUDIO);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [apiKeyMissing] = useState(!process.env.API_KEY);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Shared state logic
  const [sharedDraft, setSharedDraft] = useState<DesignDraft | null>(null);
  const [viewingShared, setViewingShared] = useState(false);

  useEffect(() => {
    // Check for share link on load
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
        try {
            const sharedDb = JSON.parse(localStorage.getItem('nanoFashion_shared') || '{}');
            if (sharedDb[shareId]) {
                setSharedDraft(sharedDb[shareId]);
                setViewingShared(true);
                setCurrentView(AppView.STUDIO);
                // Tiny delay to ensure component is mounted to receive toast
                setTimeout(() => addNotification('info', 'Viewing shared design'), 500);
            } else {
                addNotification('error', 'Shared design not found or expired');
                // Clean URL
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.pushState({path:newUrl},'',newUrl);
            }
        } catch (e) {
            console.error("Failed to load share", e);
        }
    }
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handlePublish = (newProduct: Product) => {
    const productWithUser = { ...newProduct, creator: 'You' };
    setProducts(prev => [productWithUser, ...prev]);
    setCurrentView(AppView.MARKETPLACE);
    addNotification('success', 'Product published successfully');
  };

  const handleLogout = () => {
    addNotification('info', 'Logging out...');
    setIsUserMenuOpen(false);
  };

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]"></div>
        <div className="max-w-md text-center bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-red-500/20 shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
             <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white tracking-tight">System Configuration Error</h1>
          <p className="mb-6 text-slate-400 text-sm leading-relaxed">
            The neural link is disconnected. Please ensure <code>process.env.API_KEY</code> is set in your environment variables to access the Gemini 2.5 engine.
          </p>
          <div className="text-xs text-slate-600 font-mono bg-black/30 p-3 rounded border border-white/5">
            Error Code: MISSING_API_KEY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#02040a] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
      
      {/* Global Ambient Glow */}
      <div className={`absolute top-0 left-0 w-full h-[600px] pointer-events-none transition-opacity duration-1000 ${currentView === AppView.MARKETPLACE ? 'opacity-40' : 'opacity-20'}`}>
         <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen"></div>
         <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      {/* =======================
          Desktop Top Navbar 
      ======================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-[1800px] mx-auto px-6 h-full flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentView(AppView.STUDIO)}>
            <div className="relative w-9 h-9">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-300"></div>
               <div className="relative w-full h-full bg-[#0B0F19] border border-white/10 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none text-white">Nano<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Banana</span></span>
              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-[0.2em] leading-tight mt-0.5">Studio</span>
            </div>
          </div>

          {/* Desktop Central Navigation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
            <div className="flex bg-black/40 p-1 rounded-full border border-white/5 shadow-inner backdrop-blur-md">
              <button
                onClick={() => setCurrentView(AppView.STUDIO)}
                className={`relative px-6 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all duration-300 z-10 overflow-hidden group ${currentView === AppView.STUDIO ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {currentView === AppView.STUDIO && (
                  <div className="absolute inset-0 bg-[#1e293b] rounded-full shadow-lg border border-white/10 -z-10 animate-fade-in"></div>
                )}
                Studio
              </button>
              <button
                onClick={() => setCurrentView(AppView.MARKETPLACE)}
                className={`relative px-6 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all duration-300 z-10 overflow-hidden group ${currentView === AppView.MARKETPLACE ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {currentView === AppView.MARKETPLACE && (
                  <div className="absolute inset-0 bg-[#1e293b] rounded-full shadow-lg border border-white/10 -z-10 animate-fade-in"></div>
                )}
                Marketplace
              </button>
            </div>
          </div>

          {/* User Profile & Menu */}
          <div className="hidden md:flex items-center gap-4 user-menu-container relative">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Account</span>
              <span className="text-xs font-medium text-slate-300">Creative Director</span>
            </div>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`w-9 h-9 rounded-full border transition-all ${isUserMenuOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/10 hover:border-white/30'} bg-slate-800 overflow-hidden shadow-lg`}
            >
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute top-12 right-0 w-56 bg-[#0B0F19] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in-up origin-top-right backdrop-blur-xl">
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-white text-sm font-bold">Felix Designer</p>
                  <p className="text-slate-500 text-xs truncate">felix@nanofashion.ai</p>
                </div>
                <a href="#" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">Workspace Settings</a>
                <a href="#" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">Billing & Plan</a>
                <a href="#" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">API Keys</a>
                <div className="h-px bg-white/5 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* =======================
          Main Content Frame
      ======================== */}
      <main className={`flex-1 overflow-hidden pt-16 relative z-10`}>
        <div className="h-full w-full relative">
          {/* We hide/show instead of unmount to preserve state, except when switching between shared mode which might need re-mount */}
          <div className={currentView === AppView.STUDIO ? 'block h-full' : 'hidden h-full'}>
             <Studio 
                onPublish={handlePublish} 
                onShowToast={addNotification} 
                initialDraft={sharedDraft}
                readOnly={viewingShared}
             />
          </div>
          <div className={currentView === AppView.MARKETPLACE ? 'block h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent' : 'hidden h-full'}>
             <Marketplace products={products} onShowToast={addNotification} />
          </div>
        </div>
      </main>

      {/* =======================
          Mobile Floating Dock
      ======================== */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 h-16 bg-[#0B0F19]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-around px-6 gap-6 animate-slide-up w-auto min-w-[280px]">
        <button 
          onClick={() => setCurrentView(AppView.STUDIO)}
          className={`relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${currentView === AppView.STUDIO ? 'text-indigo-400 -translate-y-1' : 'text-slate-500 active:scale-95'}`}
        >
          {currentView === AppView.STUDIO && <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>}
          <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <span className="text-[9px] font-bold uppercase tracking-wider">Studio</span>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.MARKETPLACE)}
          className={`relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${currentView === AppView.MARKETPLACE ? 'text-indigo-400 -translate-y-1' : 'text-slate-500 active:scale-95'}`}
        >
           {currentView === AppView.MARKETPLACE && <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>}
           <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
           <span className="text-[9px] font-bold uppercase tracking-wider">Shop</span>
        </button>

        <button 
           onClick={() => addNotification('info', 'Mobile Profile Coming Soon')}
           className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-500 active:scale-95"
        >
           <div className="w-6 h-6 rounded-full border border-slate-600 grayscale opacity-70 mb-0.5 overflow-hidden">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
           </div>
           <span className="text-[9px] font-bold uppercase tracking-wider">Me</span>
        </button>
      </div>
    </div>
  );
};

export default App;
