/**
 * Generation Options Panel
 * 
 * Advanced options panel for controlling AI generation parameters
 * including style references, color palettes, and quality settings.
 */

import { useState } from 'react';
import { ColorPalette, PRESET_PALETTES } from '../src/ai/color-palette';
import { StyleReference, StyleProfile } from '../src/ai/style-consistency';

interface GenerationOptionsPanelProps {
    // Style
    styleReferences: StyleReference[];
    styleProfiles: StyleProfile[];
    selectedReference: StyleReference | null;
    selectedProfile: StyleProfile | null;
    onSelectReference: (ref: StyleReference | null) => void;
    onSelectProfile: (profile: StyleProfile | null) => void;
    onAddReference: (name: string, imageBase64: string) => void;
    onRemoveReference: (id: string) => void;

    // Color
    palettes: ColorPalette[];
    selectedPalette: ColorPalette | null;
    onSelectPalette: (palette: ColorPalette | null) => void;
    onCreatePalette: (name: string, colors: string[]) => void;
    onDeletePalette: (id: string) => void;
    onGenerateHarmony: (baseColor: string, harmony: string) => string[];

    // Options
    quality: 'draft' | 'standard' | 'high';
    onQualityChange: (quality: 'draft' | 'standard' | 'high') => void;
    negativePrompt: string;
    onNegativePromptChange: (prompt: string) => void;

    // State
    isOpen: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export const GenerationOptionsPanel: React.FC<GenerationOptionsPanelProps> = ({
    styleReferences,
    styleProfiles,
    selectedReference,
    selectedProfile,
    onSelectReference,
    onSelectProfile,
    onAddReference,
    onRemoveReference,
    palettes,
    selectedPalette,
    onSelectPalette,
    onCreatePalette,
    onDeletePalette,
    onGenerateHarmony,
    quality,
    onQualityChange,
    negativePrompt,
    onNegativePromptChange,
    isOpen,
    onToggle,
    disabled = false,
}) => {
    const [activeTab, setActiveTab] = useState<'style' | 'color' | 'settings'>('settings');
    const [newPaletteName, setNewPaletteName] = useState('');
    const [harmonyBase, setHarmonyBase] = useState('#3366CC');
    const [harmonyType, setHarmonyType] = useState<'complementary' | 'analogous' | 'triadic'>('complementary');

    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Options
            </button>
        );
    }

    const renderStyleTab = () => (
        <div className="space-y-4">
            {/* Style References */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Style References</h4>
                {styleReferences.length === 0 ? (
                    <p className="text-xs text-gray-500">No style references saved. Generate a design you like and save it as a reference.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {styleReferences.map(ref => (
                            <button
                                key={ref.id}
                                onClick={() => onSelectReference(selectedReference?.id === ref.id ? null : ref)}
                                className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedReference?.id === ref.id
                                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                                        : 'border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <div className="aspect-square bg-gray-800 flex items-center justify-center">
                                    {ref.thumbnail ? (
                                        <img
                                            src={`data:image/png;base64,${ref.imageBase64}`}
                                            alt={ref.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl">🎨</span>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                                    <p className="text-xs text-white truncate">{ref.name}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveReference(ref.id);
                                    }}
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity"
                                >
                                    <span className="text-white text-xs">×</span>
                                </button>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Style Profiles */}
            {styleProfiles.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Style Profiles</h4>
                    <div className="space-y-1">
                        {styleProfiles.map(profile => (
                            <button
                                key={profile.name}
                                onClick={() => onSelectProfile(selectedProfile?.name === profile.name ? null : profile)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedProfile?.name === profile.name
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <span className="font-medium">{profile.name}</span>
                                <span className="text-gray-500 ml-2">({profile.references.length} refs)</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderColorTab = () => (
        <div className="space-y-4">
            {/* Selected Palette Preview */}
            {selectedPalette && (
                <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{selectedPalette.name}</span>
                        <button
                            onClick={() => onSelectPalette(null)}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex gap-1">
                        {selectedPalette.colors.map((color, i) => (
                            <div
                                key={i}
                                className="flex-1 h-8 rounded"
                                style={{ backgroundColor: color }}
                                title={selectedPalette.colorNames?.[i] || color}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Palettes */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Your Palettes</h4>
                {palettes.length === 0 ? (
                    <p className="text-xs text-gray-500">No palettes saved yet.</p>
                ) : (
                    <div className="space-y-2">
                        {palettes.map(palette => (
                            <button
                                key={palette.id}
                                onClick={() => onSelectPalette(selectedPalette?.id === palette.id ? null : palette)}
                                className={`w-full text-left p-2 rounded-lg transition-colors ${selectedPalette?.id === palette.id
                                        ? 'bg-purple-500/20 border border-purple-500/50'
                                        : 'bg-gray-800 hover:bg-gray-700'
                                    }`}
                            >
                                <span className="text-sm text-white block mb-1">{palette.name}</span>
                                <div className="flex gap-0.5">
                                    {palette.colors.slice(0, 6).map((color, i) => (
                                        <div
                                            key={i}
                                            className="w-5 h-5 rounded-sm"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Preset Palettes */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Preset Palettes</h4>
                <div className="space-y-2">
                    {PRESET_PALETTES.map((preset, index) => (
                        <button
                            key={index}
                            onClick={() => onCreatePalette(preset.name, preset.colors)}
                            className="w-full text-left p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            <span className="text-sm text-white block mb-1">{preset.name}</span>
                            <div className="flex gap-0.5">
                                {preset.colors.slice(0, 6).map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-5 h-5 rounded-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Harmony Generator */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2" id="harmony-label">Generate Harmony</h4>
                <div className="flex gap-2 mb-2">
                    <input
                        type="color"
                        value={harmonyBase}
                        onChange={(e) => setHarmonyBase(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                        title="Select base color for harmony"
                        aria-label="Base color picker"
                    />
                    <select
                        value={harmonyType}
                        onChange={(e) => setHarmonyType(e.target.value as typeof harmonyType)}
                        className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
                        title="Select harmony type"
                        aria-labelledby="harmony-label"
                    >
                        <option value="complementary">Complementary</option>
                        <option value="analogous">Analogous</option>
                        <option value="triadic">Triadic</option>
                    </select>
                </div>
                <button
                    onClick={() => {
                        const colors = onGenerateHarmony(harmonyBase, harmonyType);
                        const name = `${harmonyType.charAt(0).toUpperCase() + harmonyType.slice(1)} Harmony`;
                        onCreatePalette(name, colors);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                >
                    Generate & Save
                </button>
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="space-y-4">
            {/* Quality */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Generation Quality</h4>
                <div className="grid grid-cols-3 gap-2">
                    {(['draft', 'standard', 'high'] as const).map(q => (
                        <button
                            key={q}
                            onClick={() => onQualityChange(q)}
                            className={`py-2 px-3 rounded-lg text-sm capitalize transition-colors ${quality === q
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {q}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {quality === 'draft' && 'Fast generation, lower detail'}
                    {quality === 'standard' && 'Balanced speed and quality'}
                    {quality === 'high' && 'Best quality, slower generation'}
                </p>
            </div>

            {/* Negative Prompt */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Negative Prompt</h4>
                <textarea
                    value={negativePrompt}
                    onChange={(e) => onNegativePromptChange(e.target.value)}
                    placeholder="Elements to avoid (e.g., blurry, distorted, low quality)"
                    className="w-full h-20 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            {/* Active Options Summary */}
            <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Active Options</h4>
                <div className="space-y-1 text-xs text-gray-400">
                    <p>Quality: <span className="text-white capitalize">{quality}</span></p>
                    {selectedReference && (
                        <p>Style Reference: <span className="text-purple-400">{selectedReference.name}</span></p>
                    )}
                    {selectedProfile && (
                        <p>Style Profile: <span className="text-purple-400">{selectedProfile.name}</span></p>
                    )}
                    {selectedPalette && (
                        <p>Color Palette: <span className="text-purple-400">{selectedPalette.name}</span></p>
                    )}
                    {negativePrompt && (
                        <p>Negative: <span className="text-red-400">{negativePrompt.slice(0, 30)}...</span></p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">Generation Options</h3>
                <button
                    onClick={onToggle}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Close options panel"
                    aria-label="Close generation options"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                {(['settings', 'style', 'color'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-sm capitalize transition-colors ${activeTab === tab
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
                {activeTab === 'settings' && renderSettingsTab()}
                {activeTab === 'style' && renderStyleTab()}
                {activeTab === 'color' && renderColorTab()}
            </div>
        </div>
    );
};
