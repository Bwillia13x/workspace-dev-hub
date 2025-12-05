import React, { useState, useRef, useEffect } from 'react';
import { DesignDraft, Product, SavedDraft } from '../types';
import { LoadingOverlay } from './LoadingOverlay';
import { BomParser } from './BomParser';
import { CompareSlider } from './CompareSlider';
import { LazyImage } from './LazyImage';
import { GenerationOptionsPanel } from './GenerationOptionsPanel';
import {
  useAI,
  useStyleConsistency,
  useColorPalette,
  useGenerationOptions
} from '../src/hooks/useAI';
import type { StyleReference, StyleProfile } from '../src/ai/style-consistency';
import type { ColorPalette } from '../src/ai/color-palette';

interface StudioProps {
  onPublish: (product: Product) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  initialDraft?: DesignDraft | null;
  readOnly?: boolean;
}

const QUICK_EDITS = [
  "Make it red",
  "Add a retro filter",
  "Turn into a sketch",
  "Add leather texture",
  "Remove background",
  "Make it vintage denim"
];

const EXAMPLE_PROMPTS = [
  "A futuristic bioluminescent trench coat",
  "A structured avant-garde dress made of glass and silk",
  "Streetwear oversized hoodie with cybernetic patches"
];

export const Studio: React.FC<StudioProps> = ({ onPublish, onShowToast, initialDraft, readOnly = false }) => {
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [draft, setDraft] = useState<DesignDraft>({
    conceptImage: null,
    cadImage: null,
    materials: '',
    history: []
  });

  // Initialize AI hooks
  const ai = useAI();
  const styleManager = useStyleConsistency();
  const colorManager = useColorPalette();
  const generationOptions = useGenerationOptions();

  // AI Generation Options State
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const [selectedStyleRef, setSelectedStyleRef] = useState<StyleReference | null>(null);
  const [selectedStyleProfile, setSelectedStyleProfile] = useState<StyleProfile | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [generationQuality, setGenerationQuality] = useState<'draft' | 'standard' | 'high'>('standard');
  const [negativePrompt, setNegativePrompt] = useState('');

  // Initialize state from props if provided
  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      if (initialDraft.cadImage) {
        setViewMode('xray');
      } else if (initialDraft.conceptImage) {
        setViewMode('concept');
      }
      // If we have a prompt saved in the draft structure in future we would set it here
      // For now, we leave it empty or generic
    }
  }, [initialDraft]);

  const [isReadOnly, setIsReadOnly] = useState(readOnly);

  // Update local readOnly state if prop changes
  useEffect(() => {
    setIsReadOnly(readOnly);
  }, [readOnly]);

  const [isLoading, setIsLoading] = useState(false);
  const [isEngineering, setIsEngineering] = useState(false); // Specific state for scanning effect
  const [loadingMessage, setLoadingMessage] = useState('');
  const [viewMode, setViewMode] = useState<'concept' | 'engineering' | 'split' | 'xray'>('concept');
  const [isBomOpen, setIsBomOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile responsiveness

  // Trend Scout State
  const [showTrendScout, setShowTrendScout] = useState(false);
  const [trendQuery, setTrendQuery] = useState('');
  const [trendResult, setTrendResult] = useState<{ text: string, sources: { title: string, uri: string }[] } | null>(null);
  const [isSearchingTrend, setIsSearchingTrend] = useState(false);

  // Saved Drafts State
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  // Refs for panning
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Load drafts on mount
  useEffect(() => {
    const saved = localStorage.getItem('nanoFashion_drafts');
    if (saved) {
      try {
        setSavedDrafts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse drafts", e);
      }
    }
  }, []);

  // Auto-switch to xray view when CAD is ready for effect
  useEffect(() => {
    if (draft.cadImage && viewMode === 'concept') {
      setViewMode('xray');
      // Reset pan/zoom on new major generation
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [draft.cadImage]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Designing your vision with AI...');
    try {
      // Build enhanced prompt with style and color context
      let enhancedPrompt = prompt;
      const stylePrompt = styleManager.getStylePrompt();
      if (stylePrompt) {
        enhancedPrompt = `${enhancedPrompt}\n\nStyle guidance: ${stylePrompt}`;
      }
      const colorPrompt = colorManager.formatForPrompt();
      if (colorPrompt) {
        enhancedPrompt = `${enhancedPrompt}\n\n${colorPrompt}`;
      }

      const result = await ai.generateConcept(enhancedPrompt, {
        quality: generationQuality,
        negativePrompt: negativePrompt || undefined,
        colorPalette: colorManager.getColorsForGeneration(),
      });

      if (!result || !result.images || result.images.length === 0) {
        throw new Error('Generation failed');
      }

      const base64 = result.images[0];
      setDraft(prev => ({
        ...prev,
        conceptImage: base64,
        cadImage: null,
        materials: '',
        history: [...prev.history, base64]
      }));
      setViewMode('concept');
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      onShowToast('success', 'Concept generated successfully');
    } catch (e) {
      console.error(e);
      onShowToast('error', 'Failed to generate design. Try a different prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrendSearch = async () => {
    if (!trendQuery.trim()) return;
    setIsSearchingTrend(true);
    setTrendResult(null);
    try {
      const result = await ai.getFashionTrends(trendQuery);
      if (result) {
        setTrendResult(result);
      } else {
        throw new Error('No trend data returned');
      }
    } catch (e) {
      onShowToast('error', 'Failed to fetch trend data');
    } finally {
      setIsSearchingTrend(false);
    }
  };

  const handleApplyTrend = () => {
    if (trendResult) {
      const newPrompt = prompt ? `${prompt}\n\nIncorporating Trend: ${trendResult.text}` : `Design based on this trend: ${trendResult.text}`;
      setPrompt(newPrompt);
      setShowTrendScout(false);
      onShowToast('info', 'Trend applied to prompt');
    }
  };

  const handleEdit = async () => {
    if (!draft.conceptImage || !editPrompt.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Applying visual edits...');
    try {
      const result = await ai.editConcept(draft.conceptImage, editPrompt, {
        strength: 0.8,
      });

      if (!result || !result.images || result.images.length === 0) {
        throw new Error('Edit failed');
      }

      const base64 = result.images[0];
      setDraft(prev => ({
        ...prev,
        conceptImage: base64,
        cadImage: null, // Invalidate old CAD as concept changed
        materials: '',
        history: [...prev.history, base64]
      }));
      setEditPrompt('');
      onShowToast('success', 'Edit applied successfully');
    } catch (e) {
      console.error(e);
      onShowToast('error', 'Failed to edit design.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEngineer = async () => {
    if (!draft.conceptImage) return;
    // Use specialized engineering loading state for scanning effect
    setIsEngineering(true);
    // Switch to concept view so the user can see the scanning effect
    if (viewMode !== 'concept') setViewMode('concept');

    try {
      const result = await ai.generateCAD(draft.conceptImage, {
        annotationLevel: 'detailed',
        includeMeasurements: true,
      });

      if (!result) {
        throw new Error('CAD generation failed');
      }

      setDraft(prev => ({
        ...prev,
        cadImage: result.cadImage,
        materials: result.materials
      }));
      setIsBomOpen(true);
      onShowToast('success', 'Engineering pack generated');
    } catch (e) {
      console.error(e);
      onShowToast('error', 'Failed to generate engineering pack.');
    } finally {
      setIsEngineering(false);
    }
  };

  const handlePublishAction = () => {
    if (!draft.conceptImage) return;
    const newProduct: Product = {
      id: Date.now().toString(),
      name: prompt.length > 30 ? prompt.substring(0, 30) + '...' : (prompt || 'Untitled Design'),
      description: prompt,
      price: Math.floor(Math.random() * 200) + 50,
      imageUrl: draft.conceptImage,
      cadImageUrl: draft.cadImage || undefined,
      materials: draft.materials.split('\n').filter(s => s.trim().length > 0),
      creator: 'You',
      likes: 0
    };
    onPublish(newProduct);
    onShowToast('success', 'Published to Marketplace');
  };

  const restoreVersion = (img: string, index: number) => {
    if (isReadOnly) return;
    setDraft(prev => ({
      ...prev,
      conceptImage: img,
      cadImage: null,
      materials: ''
    }));
    onShowToast('info', `Restored version ${index + 1}`);
  };

  const downloadTechPack = () => {
    if (!draft.cadImage || !draft.materials) return;

    // Download BOM Text
    const blob = new Blob([draft.materials], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tech-pack-bom-${Date.now()}.txt`;
    link.click();

    // Download CAD Image
    const linkImg = document.createElement('a');
    linkImg.href = `data:image/png;base64,${draft.cadImage}`;
    linkImg.download = `tech-pack-cad-${Date.now()}.png`;
    linkImg.click();

    onShowToast('success', 'Tech Pack downloaded');
  };

  // Draft Management Functions
  const handleSaveDraft = () => {
    if (!draft.conceptImage) return;
    // Simple prompt for name
    const name = window.prompt("Name your design draft:", prompt.slice(0, 20) || "Untitled");
    if (!name) return;

    const newDraft: SavedDraft = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: draft,
      prompt: prompt
    };

    const updated = [newDraft, ...savedDrafts];
    try {
      localStorage.setItem('nanoFashion_drafts', JSON.stringify(updated));
      setSavedDrafts(updated);
      onShowToast('success', 'Draft saved to local storage');
      setShowDrafts(true);
    } catch (e) {
      onShowToast('error', 'Storage full. Delete old drafts.');
    }
  };

  const handleShareDraft = () => {
    if (!draft.conceptImage) return;

    const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    // Simulate cloud storage by using a separate localStorage key
    const sharedDb = JSON.parse(localStorage.getItem('nanoFashion_shared') || '{}');
    sharedDb[shareId] = draft;

    try {
      localStorage.setItem('nanoFashion_shared', JSON.stringify(sharedDb));

      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        onShowToast('success', 'Link copied to clipboard!');
      });
    } catch (e) {
      onShowToast('error', 'Failed to generate share link');
    }
  };

  const handleRemix = () => {
    setIsReadOnly(false);
    // Remove query param without reloading
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    onShowToast('info', 'Remix mode active. You can now edit this design.');
  };

  const handleLoadDraft = (d: SavedDraft) => {
    if (draft.conceptImage && !window.confirm(`Load "${d.name}"? Unsaved changes will be lost.`)) {
      return;
    }
    setDraft(d.data);
    setPrompt(d.prompt);
    onShowToast('info', `Loaded "${d.name}"`);
    // Check view mode based on what data is present
    if (d.data.cadImage) setViewMode('xray');
    else setViewMode('concept');
    // Ensure we aren't in read-only mode if we load a draft
    setIsReadOnly(false);
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft?")) return;

    const updated = savedDrafts.filter(d => d.id !== id);
    localStorage.setItem('nanoFashion_drafts', JSON.stringify(updated));
    setSavedDrafts(updated);
    onShowToast('info', 'Draft deleted');
  };

  // Pan Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === 'xray') return; // Let CompareSlider handle mouse in xray
    isPanning.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setPanPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  // Ensure panning stops when leaving canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => { isPanning.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur text-white p-2.5 rounded-xl border border-white/10 shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Sidebar / Tools */}
      <div className={`
        fixed md:relative z-30 h-full w-80 lg:w-96 bg-[#0B0F19] border-r border-white/5 flex flex-col shadow-2xl transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Scrollable Tool Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-10 custom-scrollbar">

          {/* Section 0: Project / Library */}
          <div className="animate-fade-in border-b border-white/5 pb-8">
            <div
              className="flex items-center justify-between mb-5 cursor-pointer hover:text-white transition-colors group select-none"
              onClick={() => setShowDrafts(!showDrafts)}
            >
              <h2 className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Library
              </h2>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{savedDrafts.length}</span>
            </div>

            {showDrafts && !isReadOnly && (
              <div className="mb-5 space-y-3">
                {savedDrafts.length === 0 && <p className="text-xs text-slate-600 italic pl-1">No saved drafts.</p>}
                {savedDrafts.map(d => (
                  <div key={d.id} className="group flex items-center justify-between bg-slate-900 border border-white/5 rounded-xl p-2 hover:border-indigo-500/50 hover:bg-slate-800 transition-all cursor-pointer shadow-sm" onClick={() => handleLoadDraft(d)}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      {d.data.conceptImage ? (
                        <LazyImage
                          src={`data:image/png;base64,${d.data.conceptImage}`}
                          className="w-10 h-10 rounded-lg object-cover"
                          containerClassName="w-10 h-10 flex-shrink-0 bg-slate-950 border border-white/5 rounded-lg"
                          alt="thumbnail"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center">
                          <span className="text-slate-700 text-[10px]">?</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[120px] group-hover:text-white transition-colors">{d.name}</span>
                        <span className="text-[9px] text-slate-600">{new Date(d.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={(e) => handleDeleteDraft(d.id, e)} className="text-slate-600 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Delete Draft">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {draft.conceptImage && !isReadOnly && (
                <button
                  onClick={handleSaveDraft}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 transition-all group"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save
                </button>
              )}
              {draft.conceptImage && (
                <button
                  onClick={handleShareDraft}
                  className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 transition-all group"
                  title="Share link"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Concept */}
          <div className="animate-fade-in">
            <div className="flex items-end justify-between mb-4">
              <div className="flex flex-col">
                <h2 className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Concept
                </h2>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono w-fit">v2.5</span>
              </div>

              {/* Trend Scout Toggle (Disabled in Read Only) */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowTrendScout(!showTrendScout)}
                  className={`text-[9px] font-bold uppercase tracking-wide flex items-center gap-1.5 px-2 py-1 rounded transition-all border ${showTrendScout ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'text-slate-500 hover:text-white border-transparent hover:bg-slate-800'}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Trend Scout
                </button>
              )}
            </div>

            {/* Trend Scout Panel */}
            {showTrendScout && !isReadOnly && (
              <div className="mb-4 bg-slate-900/50 border border-amber-500/20 rounded-xl p-3 animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <h3 className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Google Search Grounding
                </h3>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={trendQuery}
                    onChange={(e) => setTrendQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTrendSearch()}
                    placeholder="e.g. 'Paris Fashion Week 2025' or 'Bio-plastics'"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={handleTrendSearch}
                    disabled={isSearchingTrend || !trendQuery}
                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    {isSearchingTrend ? '...' : 'Go'}
                  </button>
                </div>

                {trendResult && (
                  <div className="animate-fade-in">
                    <p className="text-[10px] text-slate-300 leading-relaxed mb-3 border-l-2 border-amber-500/30 pl-2">
                      {trendResult.text}
                    </p>

                    {trendResult.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {trendResult.sources.slice(0, 3).map((source, i) => (
                          <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] text-slate-500 hover:text-amber-400 truncate max-w-[100px] flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded">
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleApplyTrend}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-lg border border-amber-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Use this insight
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="group relative mb-5">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-10 group-focus-within:opacity-30 transition duration-500 ${isReadOnly ? 'hidden' : ''}`}></div>
              <div className={`relative bg-[#0F131E] border border-white/10 rounded-xl p-1 shadow-inner ${isReadOnly ? 'opacity-50' : ''}`}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full bg-transparent p-3 text-sm text-slate-200 focus:outline-none resize-none h-28 placeholder-slate-600 leading-relaxed custom-scrollbar font-medium disabled:cursor-not-allowed"
                  placeholder={isReadOnly ? "Viewing design prompt..." : "Describe your masterpiece...\ne.g. 'A structured denim kimono with cybernetic embroidery'"}
                />
                <div className="flex justify-between items-center p-2 border-t border-white/5 bg-[#0F131E] rounded-b-lg">
                  {/* Generation Options Toggle */}
                  {!isReadOnly && (
                    <GenerationOptionsPanel
                      styleReferences={styleManager.references}
                      styleProfiles={styleManager.profiles}
                      selectedReference={styleManager.selectedReference}
                      selectedProfile={styleManager.selectedProfile}
                      onSelectReference={styleManager.setSelectedReference}
                      onSelectProfile={styleManager.setSelectedProfile}
                      onAddReference={styleManager.addReference}
                      onRemoveReference={styleManager.removeReference}
                      palettes={colorManager.palettes}
                      selectedPalette={colorManager.selectedPalette}
                      onSelectPalette={colorManager.setSelectedPalette}
                      onCreatePalette={colorManager.createPalette}
                      onDeletePalette={colorManager.deletePalette}
                      onGenerateHarmony={colorManager.generateHarmony}
                      quality={generationQuality}
                      onQualityChange={setGenerationQuality}
                      negativePrompt={negativePrompt}
                      onNegativePromptChange={setNegativePrompt}
                      isOpen={showOptionsPanel}
                      onToggle={() => setShowOptionsPanel(!showOptionsPanel)}
                      disabled={isLoading || isEngineering}
                    />
                  )}
                  {isReadOnly ? (
                    <span className="text-[10px] text-slate-500 font-mono py-1.5">READ ONLY</span>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt || isLoading || isEngineering}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span>Generate</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Edit - Hide entirely in read only unless we want to show history */}
          {draft.conceptImage && !isReadOnly && (
            <div className="animate-fade-in pt-6 border-t border-white/5">
              <h2 className="text-[10px] text-slate-400 font-bold mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                Refine
              </h2>

              <div className="flex gap-2 mb-4 bg-[#0F131E] p-1 rounded-lg border border-white/10">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEdit()}
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
                  placeholder="e.g. 'Add a retro filter'"
                />
                <button
                  onClick={handleEdit}
                  disabled={!editPrompt || isLoading || isEngineering}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-white/5"
                >
                  Apply
                </button>
              </div>

              {/* Quick Edit Chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {QUICK_EDITS.map(edit => (
                  <button
                    key={edit}
                    onClick={() => setEditPrompt(edit)}
                    className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-indigo-300 px-2.5 py-1.5 rounded-full border border-white/5 transition-all"
                  >
                    {edit}
                  </button>
                ))}
              </div>

              {/* History Strip */}
              {draft.history.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-2 tracking-wider pl-1">Versions</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {draft.history.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => restoreVersion(img, idx)}
                        title={`Restore version ${idx + 1}`}
                        aria-label={`Restore version ${idx + 1}`}
                        className={`relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-200 group ${draft.conceptImage === img ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-800 opacity-50 hover:opacity-100 hover:border-slate-600'}`}
                      >
                        <LazyImage
                          src={`data:image/png;base64,${img}`}
                          className="w-full h-full object-cover"
                          alt={`Version ${idx}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Production */}
          {draft.conceptImage && (
            <div className="animate-fade-in pt-6 border-t border-white/5 pb-8">
              <h2 className="text-[10px] text-emerald-500 font-bold mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                Production
              </h2>
              <div className="flex flex-col gap-3">
                {!isReadOnly && (
                  <button
                    onClick={handleEngineer}
                    disabled={isLoading || isEngineering}
                    className="w-full bg-[#0F131E] hover:bg-emerald-900/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isEngineering ? (
                      <>
                        <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        Generating Specs...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-emerald-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Generate Engineering Pack
                      </>
                    )}
                  </button>
                )}

                {draft.cadImage && (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={downloadTechPack}
                      className="bg-slate-900 border border-white/10 hover:bg-slate-800 hover:text-white text-slate-400 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Pack
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={handlePublishAction}
                        className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Publish
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Materials List (Terminal Style with Parser) */}
        {draft.materials && (
          <div className={`border-t border-white/10 bg-[#0B0F19] flex flex-col font-mono relative transition-all duration-300 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] ${isBomOpen ? 'h-80' : 'h-10'}`}>
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0F131E] cursor-pointer hover:bg-slate-800 transition-colors z-10"
              onClick={() => setIsBomOpen(!isBomOpen)}
            >
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <svg className={`w-3 h-3 text-emerald-500 transition-transform ${isBomOpen ? 'rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                bom_manifest.md
              </h3>
              <span className="text-[9px] text-slate-600 font-mono">
                {isBomOpen ? 'COLLAPSE' : 'EXPAND'}
              </span>
            </div>
            {isBomOpen && (
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#0B0F19]">
                <BomParser markdown={draft.materials} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className={`flex-1 bg-[#05080F] p-0 flex flex-col items-center justify-center overflow-hidden relative ${viewMode !== 'xray' ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Read Only Banner */}
        {isReadOnly && (
          <div className="absolute top-0 left-0 right-0 z-[60] bg-indigo-600/90 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Viewing Shared Design
            </span>
            <button
              onClick={handleRemix}
              className="bg-white text-indigo-600 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-sm"
            >
              Remix This
            </button>
          </div>
        )}

        {/* Background Grid Pattern (Toggleable) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-300"
          style={{
            backgroundImage: showGrid ? 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)' : 'radial-gradient(#334155 1px, transparent 1px)',
            backgroundSize: showGrid ? '40px 40px' : '24px 24px',
            transform: `translate(${panPosition.x}px, ${panPosition.y}px)`
          }}>
        </div>

        {/* Ruler Overlay */}
        {showGrid && (
          <>
            <div className="absolute top-0 left-0 right-0 h-6 bg-[#0F131E] border-b border-white/10 flex items-end justify-between px-2 text-[8px] text-slate-500 font-mono pointer-events-none z-10">
              {Array.from({ length: 20 }).map((_, i) => <span key={i}>|</span>)}
            </div>
            <div className="absolute top-0 left-0 bottom-0 w-6 bg-[#0F131E] border-r border-white/10 flex flex-col items-end justify-between py-2 text-[8px] text-slate-500 font-mono pointer-events-none z-10">
              {Array.from({ length: 20 }).map((_, i) => <span key={i}>-</span>)}
            </div>
          </>
        )}

        {/* Ambient Light */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#05080F]/40 to-[#05080F] pointer-events-none"></div>

        {/* Empty State */}
        {!draft.conceptImage && (
          <div className="text-center max-w-lg z-10 animate-fade-in-up px-6 pointer-events-none">
            <div className="w-24 h-24 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-3xl mx-auto mb-10 flex items-center justify-center border border-white/5 shadow-2xl shadow-indigo-500/10 group hover:border-indigo-500/30 transition-all duration-500 hover:scale-105 backdrop-blur-sm rotate-3 hover:rotate-6 pointer-events-auto">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">✨</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extralight text-white mb-6 tracking-tight">Design the <span className="text-indigo-400 font-normal">Future</span></h2>
            <p className="text-slate-500 text-sm font-light leading-relaxed mb-10 max-w-md mx-auto">
              NanoFashion Studio leverages Gemini 2.5 Flash to transform text into production-ready fashion engineering.
            </p>

            {!isReadOnly && (
              <div className="flex flex-col gap-3 items-center pointer-events-auto">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">Quick Start</span>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    className="text-xs text-slate-400 hover:text-indigo-300 bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-indigo-500/30 px-5 py-2.5 rounded-full transition-all"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visualizer */}
        {draft.conceptImage && (
          <div className="w-full h-full flex flex-col z-10 relative">

            {/* Floating Canvas Controls (Top Center) */}
            <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up ${isReadOnly ? 'mt-10' : ''}`}>
              <div className="bg-[#0F131E]/80 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl">
                {/* Zoom */}
                <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                  <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="text-slate-400 hover:text-white transition-colors" title="Zoom out" aria-label="Zoom out">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <span className="text-[10px] font-mono text-slate-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} className="text-slate-400 hover:text-white transition-colors" title="Zoom in" aria-label="Zoom in">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>

                {/* View Modes */}
                <div className="flex bg-slate-950/50 rounded-full p-0.5 border border-white/5">
                  {['concept', 'split', 'xray', 'engineering'].map((mode) => (
                    <button
                      key={mode}
                      disabled={mode !== 'concept' && !draft.cadImage}
                      onClick={() => {
                        setViewMode(mode as any);
                        // Reset pan when switching modes for better UX
                        if (mode === 'xray' || mode === 'split') setPanPosition({ x: 0, y: 0 });
                      }}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${viewMode === mode
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Grid Toggle & Style Reference */}
                <div className="border-l border-white/10 pl-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPanPosition({ x: 0, y: 0 });
                      setZoomLevel(1);
                    }}
                    className="text-slate-500 hover:text-white"
                    title="Reset View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-1.5 rounded-md transition-colors ${showGrid ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Toggle Grid"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        if (draft.conceptImage) {
                          const name = window.prompt("Name this style reference:", prompt.slice(0, 20) || "Style Reference");
                          if (name) {
                            styleManager.addReference(name, draft.conceptImage);
                            onShowToast('success', 'Style reference saved');
                          }
                        }
                      }}
                      className="p-1.5 rounded-md transition-colors text-purple-500 hover:text-purple-300 hover:bg-purple-500/20"
                      title="Save as Style Reference"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex gap-8 min-h-0 justify-center items-center px-6 pb-6 pt-20 overflow-hidden">

              {/* X-Ray Mode (Special Component) */}
              {viewMode === 'xray' && draft.conceptImage && draft.cadImage && (
                <div className="w-full h-full max-w-4xl animate-fade-in p-4">
                  <CompareSlider image1={draft.conceptImage} image2={draft.cadImage} zoom={zoomLevel} />
                </div>
              )}

              {/* Concept View */}
              {(viewMode === 'concept' || viewMode === 'split') && (
                <div className={`relative group h-full w-full ${viewMode === 'split' ? 'md:max-w-[48%]' : 'max-w-4xl'} bg-[#0F131E] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col transition-all duration-500 hover:border-indigo-500/30`}>
                  <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="bg-black/40 text-white text-[9px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold tracking-widest border border-white/10 uppercase flex items-center gap-2">
                      Concept Render
                    </div>
                  </div>

                  {/* Scanning Overlay for Engineering */}
                  {isEngineering && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {/* Scanning Line */}
                      <div className="absolute w-full h-[2px] bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-scan"></div>

                      {/* Grid Overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

                      {/* Status Text */}
                      <div className="absolute bottom-6 right-6 font-mono text-emerald-400 text-xs bg-black/60 px-3 py-1 rounded border border-emerald-500/30 backdrop-blur">
                        <span className="animate-pulse">ANALYZING STRUCTURE...</span>
                      </div>
                    </div>
                  )}

                  <div className="w-full h-full overflow-hidden flex items-center justify-center bg-[#0F131E] relative">
                    <img
                      src={`data:image/png;base64,${draft.conceptImage}`}
                      className="object-contain transition-transform duration-75 pointer-events-none"
                      style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})` }}
                      alt="Concept"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* CAD View */}
              {(viewMode === 'engineering' || (viewMode === 'split' && draft.cadImage)) && (
                <div className={`relative group h-full w-full ${viewMode === 'split' ? 'md:max-w-[48%]' : 'max-w-4xl'} bg-white rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col transition-all duration-500`}>
                  <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="bg-emerald-600/90 text-white text-[9px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold tracking-widest uppercase border border-white/20">
                      CAD Schematic
                    </div>
                  </div>
                  {draft.cadImage ? (
                    <div className="w-full h-full relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
                      <img
                        src={`data:image/png;base64,${draft.cadImage}`}
                        className="object-contain transition-transform duration-75 mix-blend-multiply pointer-events-none"
                        style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})` }}
                        alt="CAD"
                        draggable={false}
                      />
                      <div className="absolute bottom-4 right-4 text-[8px] text-slate-400 font-mono border border-slate-200 px-1.5 py-0.5 rounded bg-white/80 pointer-events-none">
                        FIG 1.1 // ISO-128
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 animate-pulse">Processing Schematic...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};