/**
 * Layers Panel Component
 *
 * Professional layer management UI similar to Photoshop/Figma with
 * drag-and-drop reordering, visibility toggles, opacity controls, and blend modes.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Layer, BlendMode } from '../types';
import { LayerManager } from './layer-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface LayersPanelProps {
    layers: Layer[];
    selectedIds: string[];
    activeLayerId: string | null;
    onLayerSelect: (layerId: string, addToSelection?: boolean) => void;
    onLayerVisibilityToggle: (layerId: string) => void;
    onLayerLockToggle: (layerId: string) => void;
    onLayerOpacityChange: (layerId: string, opacity: number) => void;
    onLayerBlendModeChange: (layerId: string, blendMode: BlendMode) => void;
    onLayerRename: (layerId: string, newName: string) => void;
    onLayerDelete: (layerId: string) => void;
    onLayerDuplicate: (layerId: string) => void;
    onLayerReorder: (dragId: string, targetId: string, position: 'before' | 'after') => void;
    onLayerGroup?: (layerIds: string[]) => void;
    onLayerUngroup?: (groupId: string) => void;
    onAddLayer?: (type: 'shape' | 'text' | 'image') => void;
    className?: string;
}

interface LayerItemProps {
    layer: Layer;
    isSelected: boolean;
    isActive: boolean;
    depth: number;
    onSelect: (layerId: string, addToSelection?: boolean) => void;
    onVisibilityToggle: (layerId: string) => void;
    onLockToggle: (layerId: string) => void;
    onRename: (layerId: string, newName: string) => void;
    onDelete: (layerId: string) => void;
    onDuplicate: (layerId: string) => void;
    onDragStart: (layerId: string) => void;
    onDragOver: (layerId: string, position: 'before' | 'after') => void;
    onDragEnd: () => void;
    isDragging: boolean;
    dragOverPosition: { layerId: string; position: 'before' | 'after' } | null;
}

// ============================================================================
// BLEND MODE OPTIONS
// ============================================================================

const BLEND_MODES: { value: BlendMode; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'darken', label: 'Darken' },
    { value: 'lighten', label: 'Lighten' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'hard-light', label: 'Hard Light' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'hue', label: 'Hue' },
    { value: 'saturation', label: 'Saturation' },
    { value: 'color', label: 'Color' },
    { value: 'luminosity', label: 'Luminosity' },
];

// ============================================================================
// LAYER TYPE ICONS
// ============================================================================

const LayerTypeIcon: React.FC<{ type: Layer['type'] }> = ({ type }) => {
    const icons: Record<Layer['type'], string> = {
        image: '🖼️',
        shape: '⬜',
        text: 'T',
        group: '📁',
        mask: '🎭',
        adjustment: '🎨',
        pattern: '🔲',
        vector: '✏️',
    };

    return (
        <span className="layer-type-icon" title={type}>
            {icons[type]}
        </span>
    );
};

// ============================================================================
// LAYER ITEM COMPONENT
// ============================================================================

const LayerItem: React.FC<LayerItemProps> = ({
    layer,
    isSelected,
    isActive,
    depth,
    onSelect,
    onVisibilityToggle,
    onLockToggle,
    onRename,
    onDelete,
    onDuplicate,
    onDragStart,
    onDragOver,
    onDragEnd,
    isDragging,
    dragOverPosition,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(layer.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const showDropIndicator = dragOverPosition?.layerId === layer.id;
    const dropPosition = showDropIndicator ? dragOverPosition?.position : null;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = useCallback(() => {
        setIsEditing(true);
        setEditName(layer.name);
    }, [layer.name]);

    const handleNameSubmit = useCallback(() => {
        if (editName.trim() && editName !== layer.name) {
            onRename(layer.id, editName.trim());
        }
        setIsEditing(false);
    }, [editName, layer.id, layer.name, onRename]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleNameSubmit();
            } else if (e.key === 'Escape') {
                setEditName(layer.name);
                setIsEditing(false);
            }
        },
        [handleNameSubmit, layer.name]
    );

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            onSelect(layer.id, e.shiftKey || e.metaKey);
        },
        [layer.id, onSelect]
    );

    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', layer.id);
            onDragStart(layer.id);
        },
        [layer.id, onDragStart]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const position = y < rect.height / 2 ? 'before' : 'after';
            onDragOver(layer.id, position);
        },
        [layer.id, onDragOver]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            // Could implement custom context menu here
        },
        []
    );

    const containerStyle: React.CSSProperties = {
        paddingLeft: `${12 + depth * 16}px`,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            className={`layer-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${!layer.visible ? 'hidden-layer' : ''
                }`}
            style={containerStyle}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            draggable={!layer.locked && !isEditing}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={onDragEnd}
        >
            {dropPosition === 'before' && <div className="drop-indicator drop-before" />}

            {/* Visibility Toggle */}
            <button
                className={`layer-visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onVisibilityToggle(layer.id);
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
                {layer.visible ? '👁️' : '👁️‍🗨️'}
            </button>

            {/* Lock Toggle */}
            <button
                className={`layer-lock-btn ${layer.locked ? 'locked' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onLockToggle(layer.id);
                }}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            >
                {layer.locked ? '🔒' : '🔓'}
            </button>

            {/* Layer Type Icon */}
            <LayerTypeIcon type={layer.type} />

            {/* Layer Name */}
            <div className="layer-name">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="layer-name-input"
                        aria-label="Layer name"
                        placeholder="Layer name"
                    />
                ) : (
                    <span className="layer-name-text">{layer.name}</span>
                )}
            </div>

            {/* Opacity Indicator */}
            {layer.opacity < 100 && (
                <span className="layer-opacity-badge" title={`Opacity: ${layer.opacity}%`}>
                    {layer.opacity}%
                </span>
            )}

            {/* Blend Mode Indicator */}
            {layer.blendMode !== 'normal' && (
                <span className="layer-blend-badge" title={`Blend: ${layer.blendMode}`}>
                    {layer.blendMode.slice(0, 3)}
                </span>
            )}

            {/* Actions Menu */}
            <div className="layer-actions">
                <button
                    className="layer-action-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(layer.id);
                    }}
                    title="Duplicate layer"
                >
                    📋
                </button>
                <button
                    className="layer-action-btn delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(layer.id);
                    }}
                    title="Delete layer"
                >
                    🗑️
                </button>
            </div>

            {dropPosition === 'after' && <div className="drop-indicator drop-after" />}
        </div>
    );
};

// ============================================================================
// LAYERS PANEL COMPONENT
// ============================================================================

export const LayersPanel: React.FC<LayersPanelProps> = ({
    layers,
    selectedIds,
    activeLayerId,
    onLayerSelect,
    onLayerVisibilityToggle,
    onLayerLockToggle,
    onLayerOpacityChange,
    onLayerBlendModeChange,
    onLayerRename,
    onLayerDelete,
    onLayerDuplicate,
    onLayerReorder,
    onLayerGroup,
    onLayerUngroup,
    onAddLayer,
    className = '',
}) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<{
        layerId: string;
        position: 'before' | 'after';
    } | null>(null);
    const [showOpacitySlider, setShowOpacitySlider] = useState(false);
    const [showBlendModeDropdown, setShowBlendModeDropdown] = useState(false);

    // Get active layer for property controls
    const activeLayer = useMemo(
        () => layers.find((l) => l.id === activeLayerId) || null,
        [layers, activeLayerId]
    );

    // Reversed layers for display (top layers first in UI)
    const displayLayers = useMemo(() => [...layers].reverse(), [layers]);

    // Build depth map for groups
    const depthMap = useMemo(() => {
        const map = new Map<string, number>();
        const calculateDepth = (layer: Layer, depth: number) => {
            map.set(layer.id, depth);
            if (layer.type === 'group' && layer.children) {
                layer.children.forEach((childId) => {
                    const child = layers.find((l) => l.id === childId);
                    if (child) calculateDepth(child, depth + 1);
                });
            }
        };
        layers.forEach((layer) => {
            if (!layer.parentId) {
                calculateDepth(layer, 0);
            }
        });
        return map;
    }, [layers]);

    // Drag handlers
    const handleDragStart = useCallback((layerId: string) => {
        setDraggingId(layerId);
    }, []);

    const handleDragOver = useCallback(
        (layerId: string, position: 'before' | 'after') => {
            if (layerId !== draggingId) {
                setDragOverPosition({ layerId, position });
            }
        },
        [draggingId]
    );

    const handleDragEnd = useCallback(() => {
        if (draggingId && dragOverPosition) {
            onLayerReorder(draggingId, dragOverPosition.layerId, dragOverPosition.position);
        }
        setDraggingId(null);
        setDragOverPosition(null);
    }, [draggingId, dragOverPosition, onLayerReorder]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            handleDragEnd();
        },
        [handleDragEnd]
    );

    // Group/Ungroup handlers
    const handleGroupSelected = useCallback(() => {
        if (selectedIds.length >= 2 && onLayerGroup) {
            onLayerGroup(selectedIds);
        }
    }, [selectedIds, onLayerGroup]);

    const handleUngroup = useCallback(() => {
        if (activeLayer?.type === 'group' && onLayerUngroup) {
            onLayerUngroup(activeLayer.id);
        }
    }, [activeLayer, onLayerUngroup]);

    return (
        <div className={`layers-panel ${className}`}>
            {/* Panel Header */}
            <div className="layers-panel-header">
                <h3 className="layers-panel-title">Layers</h3>
                <div className="layers-panel-actions">
                    {onAddLayer && (
                        <>
                            <button
                                className="add-layer-btn"
                                onClick={() => onAddLayer('shape')}
                                title="Add shape layer"
                            >
                                ⬜
                            </button>
                            <button
                                className="add-layer-btn"
                                onClick={() => onAddLayer('text')}
                                title="Add text layer"
                            >
                                T
                            </button>
                            <button
                                className="add-layer-btn"
                                onClick={() => onAddLayer('image')}
                                title="Add image layer"
                            >
                                🖼️
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Active Layer Properties */}
            {activeLayer && (
                <div className="layer-properties">
                    {/* Opacity Control */}
                    <div className="layer-property">
                        <label htmlFor="opacity-slider">Opacity</label>
                        <div className="opacity-control">
                            <input
                                id="opacity-slider"
                                type="range"
                                min="0"
                                max="100"
                                value={activeLayer.opacity}
                                onChange={(e) =>
                                    onLayerOpacityChange(activeLayer.id, parseInt(e.target.value, 10))
                                }
                                className="opacity-slider"
                                aria-label="Layer opacity"
                                title="Layer opacity"
                            />
                            <span className="opacity-value">{activeLayer.opacity}%</span>
                        </div>
                    </div>

                    {/* Blend Mode Control */}
                    <div className="layer-property">
                        <label htmlFor="blend-mode-select">Blend</label>
                        <select
                            id="blend-mode-select"
                            value={activeLayer.blendMode}
                            onChange={(e) =>
                                onLayerBlendModeChange(activeLayer.id, e.target.value as BlendMode)
                            }
                            className="blend-mode-select"
                            title="Layer blend mode"
                            aria-label="Layer blend mode"
                        >
                            {BLEND_MODES.map((mode) => (
                                <option key={mode.value} value={mode.value}>
                                    {mode.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Layer List */}
            <div
                className="layers-list"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                {displayLayers.length === 0 ? (
                    <div className="layers-empty">
                        <p>No layers yet</p>
                        <p className="layers-empty-hint">
                            Add a shape, text, or image to get started
                        </p>
                    </div>
                ) : (
                    displayLayers.map((layer) => (
                        <LayerItem
                            key={layer.id}
                            layer={layer}
                            isSelected={selectedIds.includes(layer.id)}
                            isActive={layer.id === activeLayerId}
                            depth={depthMap.get(layer.id) || 0}
                            onSelect={onLayerSelect}
                            onVisibilityToggle={onLayerVisibilityToggle}
                            onLockToggle={onLayerLockToggle}
                            onRename={onLayerRename}
                            onDelete={onLayerDelete}
                            onDuplicate={onLayerDuplicate}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            isDragging={layer.id === draggingId}
                            dragOverPosition={dragOverPosition}
                        />
                    ))
                )}
            </div>

            {/* Panel Footer */}
            <div className="layers-panel-footer">
                <button
                    className="footer-btn"
                    onClick={handleGroupSelected}
                    disabled={selectedIds.length < 2}
                    title="Group selected layers"
                >
                    📁 Group
                </button>
                <button
                    className="footer-btn"
                    onClick={handleUngroup}
                    disabled={activeLayer?.type !== 'group'}
                    title="Ungroup"
                >
                    📂 Ungroup
                </button>
                <button
                    className="footer-btn delete"
                    onClick={() => activeLayerId && onLayerDelete(activeLayerId)}
                    disabled={!activeLayerId}
                    title="Delete selected layer"
                >
                    🗑️ Delete
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// STYLES (can be moved to CSS file)
// ============================================================================

export const layersPanelStyles = `
.layers-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100%;
  background: var(--panel-bg, #1e1e1e);
  border-left: 1px solid var(--border-color, #333);
  color: var(--text-color, #e0e0e0);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
}

.layers-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #333);
}

.layers-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.layers-panel-actions {
  display: flex;
  gap: 4px;
}

.add-layer-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.add-layer-btn:hover {
  background: var(--hover-bg, #2a2a2a);
}

.layer-properties {
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #333);
}

.layer-property {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.layer-property:last-child {
  margin-bottom: 0;
}

.layer-property label {
  width: 50px;
  font-size: 11px;
  color: var(--text-muted, #888);
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.opacity-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: var(--slider-bg, #333);
  border-radius: 2px;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-color, #007aff);
  border-radius: 50%;
  cursor: pointer;
}

.opacity-value {
  width: 36px;
  text-align: right;
  font-size: 11px;
  color: var(--text-muted, #888);
}

.blend-mode-select {
  flex: 1;
  padding: 4px 8px;
  background: var(--input-bg, #2a2a2a);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  color: inherit;
  font-size: 11px;
}

.layers-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.layers-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-muted, #888);
}

.layers-empty-hint {
  font-size: 11px;
  margin-top: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.layer-item:hover {
  background: var(--hover-bg, #2a2a2a);
}

.layer-item.selected {
  background: var(--selected-bg, #0d47a1);
}

.layer-item.active {
  background: var(--active-bg, #1565c0);
}

.layer-item.hidden-layer {
  opacity: 0.5;
}

.layer-visibility-btn,
.layer-lock-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
}

.layer-visibility-btn:hover,
.layer-lock-btn:hover {
  opacity: 1;
}

.layer-visibility-btn.hidden {
  opacity: 0.3;
}

.layer-lock-btn.locked {
  opacity: 1;
  color: var(--warning-color, #ffb300);
}

.layer-type-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.layer-name {
  flex: 1;
  min-width: 0;
}

.layer-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-name-input {
  width: 100%;
  padding: 2px 4px;
  background: var(--input-bg, #2a2a2a);
  border: 1px solid var(--accent-color, #007aff);
  border-radius: 2px;
  color: inherit;
  font-size: 12px;
}

.layer-opacity-badge,
.layer-blend-badge {
  font-size: 9px;
  padding: 1px 4px;
  background: var(--badge-bg, #333);
  border-radius: 2px;
  color: var(--text-muted, #888);
}

.layer-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.layer-item:hover .layer-actions {
  opacity: 1;
}

.layer-action-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 11px;
  opacity: 0.6;
}

.layer-action-btn:hover {
  opacity: 1;
}

.layer-action-btn.delete:hover {
  color: var(--danger-color, #f44336);
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-color, #007aff);
  pointer-events: none;
}

.drop-before {
  top: 0;
}

.drop-after {
  bottom: 0;
}

.layers-panel-footer {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color, #333);
}

.footer-btn {
  flex: 1;
  padding: 6px 8px;
  background: var(--button-bg, #2a2a2a);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
}

.footer-btn:hover:not(:disabled) {
  background: var(--hover-bg, #333);
}

.footer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.footer-btn.delete:hover:not(:disabled) {
  border-color: var(--danger-color, #f44336);
  color: var(--danger-color, #f44336);
}
`;

export default LayersPanel;
