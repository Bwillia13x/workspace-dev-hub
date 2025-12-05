/**
 * Text Tools - Professional typography system for fashion design
 *
 * Provides:
 * - Rich text editing
 * - Google Fonts integration (300+ fonts)
 * - Text styling (weight, style, decoration)
 * - Text effects (outline, shadow, warp)
 * - Character and paragraph formatting
 * - Text on path
 */

import {
    FillStyle,
    StrokeStyle,
    VectorPath,
    Point,
} from '../types';

// ============================================================================
// Font Types
// ============================================================================

export interface GoogleFontInfo {
    family: string;
    variants: string[];
    subsets: string[];
    category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
    version: string;
    lastModified: string;
}

export interface LoadedFont {
    family: string;
    weight: number;
    style: 'normal' | 'italic';
    loaded: boolean;
}

// ============================================================================
// Text Formatting Types
// ============================================================================

export interface CharacterStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    textDecoration: 'none' | 'underline' | 'line-through' | 'overline';
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    fill: FillStyle;
    stroke?: StrokeStyle;
    letterSpacing: number;
    baselineShift: number; // For superscript/subscript
    opacity: number;
}

export interface ParagraphStyle {
    textAlign: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
    paragraphSpacing: number;
    indentFirst: number;
    indentLeft: number;
    indentRight: number;
    hyphenation: boolean;
    listStyle: 'none' | 'bullet' | 'number' | 'letter';
}

export interface TextRange {
    start: number;
    end: number;
    style: Partial<CharacterStyle>;
}

export interface TextBox {
    id: string;
    text: string;
    position: Point;
    width: number;
    height: number;
    autoHeight: boolean;
    rotation: number;
    defaultStyle: CharacterStyle;
    paragraphStyle: ParagraphStyle;
    ranges: TextRange[];
    effects: TextEffects;
    cursorPosition?: number;
    selectionStart?: number;
    selectionEnd?: number;
}

// ============================================================================
// Text Effects Types
// ============================================================================

export interface TextEffects {
    dropShadow?: {
        enabled: boolean;
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
        opacity: number;
    };
    outline?: {
        enabled: boolean;
        color: string;
        width: number;
        opacity: number;
    };
    glow?: {
        enabled: boolean;
        color: string;
        blur: number;
        opacity: number;
    };
    warp?: TextWarp;
}

export type TextWarpType =
    | 'none'
    | 'arc'
    | 'arc-lower'
    | 'arc-upper'
    | 'arch'
    | 'bulge'
    | 'flag'
    | 'wave'
    | 'fish'
    | 'rise'
    | 'fisheye'
    | 'inflate'
    | 'squeeze'
    | 'twist';

export interface TextWarp {
    type: TextWarpType;
    bend: number;       // -100 to 100
    horizontal: number; // -100 to 100
    vertical: number;   // -100 to 100
}

// ============================================================================
// Text on Path Types
// ============================================================================

export interface TextOnPath {
    id: string;
    text: string;
    path: VectorPath;
    startOffset: number; // 0-100, percentage along path
    alignment: 'left' | 'center' | 'right';
    side: 'top' | 'bottom';
    style: CharacterStyle;
    letterSpacing: number;
}

// ============================================================================
// Text Tools Events
// ============================================================================

export interface TextToolsEvents {
    'text:created': { textBox: TextBox };
    'text:updated': { textBox: TextBox; changes: Partial<TextBox> };
    'text:deleted': { textBoxId: string };
    'text:selected': { textBoxId: string };
    'text:deselected': { textBoxId: string };
    'font:loaded': { font: LoadedFont };
    'font:error': { family: string; error: string };
}

type TextEventCallback<K extends keyof TextToolsEvents> = (data: TextToolsEvents[K]) => void;

// ============================================================================
// Fashion Font Categories
// ============================================================================

export const FASHION_FONTS = {
    luxury: [
        'Playfair Display',
        'Cormorant Garamond',
        'Bodoni Moda',
        'Libre Baskerville',
        'Tenor Sans',
        'Italiana',
        'Rozha One',
        'Luxurious Script',
    ],
    modern: [
        'Montserrat',
        'Poppins',
        'Raleway',
        'DM Sans',
        'Outfit',
        'Inter',
        'Space Grotesk',
        'Sora',
    ],
    editorial: [
        'Source Serif Pro',
        'Merriweather',
        'Lora',
        'Noto Serif',
        'Spectral',
        'Crimson Text',
        'PT Serif',
        'Vollkorn',
    ],
    minimalist: [
        'Josefin Sans',
        'Questrial',
        'Quicksand',
        'Karla',
        'Work Sans',
        'Manrope',
        'Lexend',
        'Archivo',
    ],
    streetwear: [
        'Oswald',
        'Anton',
        'Barlow Condensed',
        'Bebas Neue',
        'Teko',
        'Black Ops One',
        'Rubik',
        'Russo One',
    ],
    elegant: [
        'Great Vibes',
        'Dancing Script',
        'Tangerine',
        'Sacramento',
        'Parisienne',
        'Alex Brush',
        'Allura',
        'Pinyon Script',
    ],
};

// ============================================================================
// Default Styles
// ============================================================================

export const DEFAULT_CHARACTER_STYLE: CharacterStyle = {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none',
    fill: { type: 'solid', color: '#000000' },
    letterSpacing: 0,
    baselineShift: 0,
    opacity: 100,
};

export const DEFAULT_PARAGRAPH_STYLE: ParagraphStyle = {
    textAlign: 'left',
    lineHeight: 1.4,
    paragraphSpacing: 12,
    indentFirst: 0,
    indentLeft: 0,
    indentRight: 0,
    hyphenation: false,
    listStyle: 'none',
};

export const DEFAULT_TEXT_EFFECTS: TextEffects = {};

// ============================================================================
// Text Tools Manager
// ============================================================================

export class TextToolsManager {
    private textBoxes: Map<string, TextBox> = new Map();
    private loadedFonts: Map<string, LoadedFont> = new Map();
    private selectedTextBoxId: string | null = null;
    private eventListeners: Map<string, Set<TextEventCallback<keyof TextToolsEvents>>> = new Map();
    private googleFontsApiKey?: string;

    constructor(options: { googleFontsApiKey?: string } = {}) {
        this.googleFontsApiKey = options.googleFontsApiKey;
    }

    // ========================================================================
    // Event System
    // ========================================================================

    on<K extends keyof TextToolsEvents>(
        event: K,
        callback: TextEventCallback<K>
    ): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback as TextEventCallback<keyof TextToolsEvents>);
        return () => this.off(event, callback);
    }

    off<K extends keyof TextToolsEvents>(
        event: K,
        callback: TextEventCallback<K>
    ): void {
        this.eventListeners.get(event)?.delete(callback as TextEventCallback<keyof TextToolsEvents>);
    }

    private emit<K extends keyof TextToolsEvents>(
        event: K,
        data: TextToolsEvents[K]
    ): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in text tool event listener for ${event}:`, error);
            }
        });
    }

    // ========================================================================
    // Font Loading
    // ========================================================================

    /**
     * Load a Google Font
     */
    async loadGoogleFont(
        family: string,
        weights: number[] = [400],
        styles: Array<'normal' | 'italic'> = ['normal']
    ): Promise<void> {
        const fontKey = `${family}-${weights.join(',')}-${styles.join(',')}`;

        if (this.loadedFonts.has(fontKey)) {
            return;
        }

        try {
            // Build Google Fonts URL
            const weightParam = weights
                .flatMap(w => styles.map(s => (s === 'italic' ? `1,${w}` : `0,${w}`)))
                .join(';');

            const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${weightParam}&display=swap`;

            // Create link element
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;

            // Wait for font to load
            await new Promise<void>((resolve, reject) => {
                link.onload = () => resolve();
                link.onerror = () => reject(new Error(`Failed to load font: ${family}`));
                document.head.appendChild(link);
            });

            // Use Font Loading API to ensure font is ready
            await document.fonts.ready;

            // Mark as loaded
            for (const weight of weights) {
                for (const style of styles) {
                    const font: LoadedFont = {
                        family,
                        weight,
                        style,
                        loaded: true,
                    };
                    this.loadedFonts.set(`${family}-${weight}-${style}`, font);
                    this.emit('font:loaded', { font });
                }
            }
        } catch (error) {
            this.emit('font:error', {
                family,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }

    /**
     * Preload common fashion fonts
     */
    async preloadFashionFonts(): Promise<void> {
        const fonts = [
            'Inter',
            'Montserrat',
            'Playfair Display',
            'Oswald',
            'Poppins',
        ];

        await Promise.all(
            fonts.map(family =>
                this.loadGoogleFont(family, [400, 500, 600, 700], ['normal', 'italic'])
                    .catch(err => console.warn(`Failed to preload ${family}:`, err))
            )
        );
    }

    /**
     * Check if a font is loaded
     */
    isFontLoaded(family: string, weight: number = 400, style: 'normal' | 'italic' = 'normal'): boolean {
        return this.loadedFonts.has(`${family}-${weight}-${style}`);
    }

    /**
     * Get list of loaded fonts
     */
    getLoadedFonts(): LoadedFont[] {
        return Array.from(this.loadedFonts.values());
    }

    // ========================================================================
    // Text Box Creation & Management
    // ========================================================================

    /**
     * Create a new text box
     */
    createTextBox(
        text: string,
        position: Point,
        options: Partial<Omit<TextBox, 'id' | 'text' | 'position'>> = {}
    ): TextBox {
        const textBox: TextBox = {
            id: this.generateId(),
            text,
            position,
            width: options.width ?? 300,
            height: options.height ?? 100,
            autoHeight: options.autoHeight ?? true,
            rotation: options.rotation ?? 0,
            defaultStyle: options.defaultStyle ?? { ...DEFAULT_CHARACTER_STYLE },
            paragraphStyle: options.paragraphStyle ?? { ...DEFAULT_PARAGRAPH_STYLE },
            ranges: options.ranges ?? [],
            effects: options.effects ?? { ...DEFAULT_TEXT_EFFECTS },
        };

        this.textBoxes.set(textBox.id, textBox);
        this.emit('text:created', { textBox });

        // Auto-load the font if not already loaded
        this.loadGoogleFont(textBox.defaultStyle.fontFamily).catch(() => { });

        return textBox;
    }

    /**
     * Get a text box by ID
     */
    getTextBox(id: string): TextBox | undefined {
        return this.textBoxes.get(id);
    }

    /**
     * Get all text boxes
     */
    getAllTextBoxes(): TextBox[] {
        return Array.from(this.textBoxes.values());
    }

    /**
     * Update text box content
     */
    updateText(id: string, text: string): void {
        const textBox = this.textBoxes.get(id);
        if (!textBox) return;

        textBox.text = text;
        this.emit('text:updated', { textBox, changes: { text } });
    }

    /**
     * Update text box properties
     */
    updateTextBox(id: string, changes: Partial<TextBox>): void {
        const textBox = this.textBoxes.get(id);
        if (!textBox) return;

        Object.assign(textBox, changes);
        this.emit('text:updated', { textBox, changes });
    }

    /**
     * Delete text box
     */
    deleteTextBox(id: string): boolean {
        if (this.textBoxes.has(id)) {
            this.textBoxes.delete(id);
            if (this.selectedTextBoxId === id) {
                this.selectedTextBoxId = null;
            }
            this.emit('text:deleted', { textBoxId: id });
            return true;
        }
        return false;
    }

    /**
     * Duplicate text box
     */
    duplicateTextBox(id: string, offset: Point = { x: 20, y: 20 }): TextBox | null {
        const original = this.textBoxes.get(id);
        if (!original) return null;

        const copy = this.createTextBox(original.text, {
            x: original.position.x + offset.x,
            y: original.position.y + offset.y,
        }, {
            width: original.width,
            height: original.height,
            autoHeight: original.autoHeight,
            rotation: original.rotation,
            defaultStyle: { ...original.defaultStyle },
            paragraphStyle: { ...original.paragraphStyle },
            ranges: JSON.parse(JSON.stringify(original.ranges)),
            effects: JSON.parse(JSON.stringify(original.effects)),
        });

        return copy;
    }

    // ========================================================================
    // Character Styling
    // ========================================================================

    /**
     * Apply character style to a range
     */
    applyCharacterStyle(
        textBoxId: string,
        start: number,
        end: number,
        style: Partial<CharacterStyle>
    ): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        // Load font if font family changed
        if (style.fontFamily) {
            this.loadGoogleFont(style.fontFamily).catch(() => { });
        }

        // Find overlapping ranges and merge/split
        const newRanges: TextRange[] = [];
        let handled = false;

        for (const range of textBox.ranges) {
            if (range.end <= start || range.start >= end) {
                // No overlap
                newRanges.push(range);
            } else if (range.start >= start && range.end <= end) {
                // Range is fully contained - merge styles
                newRanges.push({
                    ...range,
                    style: { ...range.style, ...style },
                });
                handled = true;
            } else if (range.start < start && range.end > end) {
                // Selection is inside range - split
                newRanges.push(
                    { start: range.start, end: start, style: range.style },
                    { start, end, style: { ...range.style, ...style } },
                    { start: end, end: range.end, style: range.style }
                );
                handled = true;
            } else if (range.start < start && range.end > start) {
                // Overlap at start
                newRanges.push(
                    { start: range.start, end: start, style: range.style },
                    { start, end: range.end, style: { ...range.style, ...style } }
                );
                handled = true;
            } else if (range.start < end && range.end > end) {
                // Overlap at end
                newRanges.push(
                    { start: range.start, end, style: { ...range.style, ...style } },
                    { start: end, end: range.end, style: range.style }
                );
                handled = true;
            }
        }

        if (!handled) {
            // New range doesn't overlap any existing
            newRanges.push({ start, end, style });
        }

        // Sort and merge adjacent ranges with same styles
        textBox.ranges = this.mergeRanges(newRanges);
        this.emit('text:updated', { textBox, changes: { ranges: textBox.ranges } });
    }

    /**
     * Apply style to entire text box
     */
    applyStyleToAll(textBoxId: string, style: Partial<CharacterStyle>): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        // Load font if font family changed
        if (style.fontFamily) {
            this.loadGoogleFont(style.fontFamily).catch(() => { });
        }

        // Update default style
        Object.assign(textBox.defaultStyle, style);

        // Clear ranges as we're applying uniform style
        textBox.ranges = [];

        this.emit('text:updated', { textBox, changes: { defaultStyle: textBox.defaultStyle } });
    }

    /**
     * Get computed style at position
     */
    getStyleAtPosition(textBoxId: string, position: number): CharacterStyle {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return { ...DEFAULT_CHARACTER_STYLE };

        let style = { ...textBox.defaultStyle };

        for (const range of textBox.ranges) {
            if (position >= range.start && position < range.end) {
                style = { ...style, ...range.style };
            }
        }

        return style;
    }

    // ========================================================================
    // Paragraph Styling
    // ========================================================================

    /**
     * Update paragraph style
     */
    updateParagraphStyle(textBoxId: string, style: Partial<ParagraphStyle>): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        Object.assign(textBox.paragraphStyle, style);
        this.emit('text:updated', { textBox, changes: { paragraphStyle: textBox.paragraphStyle } });
    }

    // ========================================================================
    // Text Effects
    // ========================================================================

    /**
     * Apply text effects
     */
    applyTextEffects(textBoxId: string, effects: Partial<TextEffects>): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        textBox.effects = { ...textBox.effects, ...effects };
        this.emit('text:updated', { textBox, changes: { effects: textBox.effects } });
    }

    /**
     * Apply text warp
     */
    applyTextWarp(textBoxId: string, warp: TextWarp): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        textBox.effects.warp = warp;
        this.emit('text:updated', { textBox, changes: { effects: textBox.effects } });
    }

    /**
     * Remove text warp
     */
    removeTextWarp(textBoxId: string): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        delete textBox.effects.warp;
        this.emit('text:updated', { textBox, changes: { effects: textBox.effects } });
    }

    // ========================================================================
    // Selection & Cursor
    // ========================================================================

    /**
     * Select a text box
     */
    selectTextBox(id: string): void {
        if (this.selectedTextBoxId !== id) {
            if (this.selectedTextBoxId) {
                this.emit('text:deselected', { textBoxId: this.selectedTextBoxId });
            }
            this.selectedTextBoxId = id;
            this.emit('text:selected', { textBoxId: id });
        }
    }

    /**
     * Deselect current text box
     */
    deselectTextBox(): void {
        if (this.selectedTextBoxId) {
            this.emit('text:deselected', { textBoxId: this.selectedTextBoxId });
            this.selectedTextBoxId = null;
        }
    }

    /**
     * Get selected text box
     */
    getSelectedTextBox(): TextBox | null {
        return this.selectedTextBoxId ? this.textBoxes.get(this.selectedTextBoxId) ?? null : null;
    }

    /**
     * Set cursor position
     */
    setCursorPosition(textBoxId: string, position: number): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        textBox.cursorPosition = Math.max(0, Math.min(position, textBox.text.length));
        textBox.selectionStart = undefined;
        textBox.selectionEnd = undefined;
    }

    /**
     * Set text selection
     */
    setSelection(textBoxId: string, start: number, end: number): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        textBox.selectionStart = Math.max(0, Math.min(start, textBox.text.length));
        textBox.selectionEnd = Math.max(0, Math.min(end, textBox.text.length));
        textBox.cursorPosition = textBox.selectionEnd;
    }

    /**
     * Get selected text
     */
    getSelectedText(textBoxId: string): string {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox || textBox.selectionStart === undefined || textBox.selectionEnd === undefined) {
            return '';
        }

        const start = Math.min(textBox.selectionStart, textBox.selectionEnd);
        const end = Math.max(textBox.selectionStart, textBox.selectionEnd);

        return textBox.text.substring(start, end);
    }

    // ========================================================================
    // Text Operations
    // ========================================================================

    /**
     * Insert text at cursor position
     */
    insertText(textBoxId: string, text: string): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        const pos = textBox.cursorPosition ?? textBox.text.length;

        // Replace selection if any
        if (textBox.selectionStart !== undefined && textBox.selectionEnd !== undefined) {
            const start = Math.min(textBox.selectionStart, textBox.selectionEnd);
            const end = Math.max(textBox.selectionStart, textBox.selectionEnd);

            textBox.text = textBox.text.substring(0, start) + text + textBox.text.substring(end);
            textBox.cursorPosition = start + text.length;
            textBox.selectionStart = undefined;
            textBox.selectionEnd = undefined;

            // Adjust ranges
            this.adjustRangesAfterEdit(textBox, start, end - start, text.length);
        } else {
            textBox.text = textBox.text.substring(0, pos) + text + textBox.text.substring(pos);
            textBox.cursorPosition = pos + text.length;

            // Adjust ranges
            this.adjustRangesAfterEdit(textBox, pos, 0, text.length);
        }

        this.emit('text:updated', { textBox, changes: { text: textBox.text } });
    }

    /**
     * Delete text at cursor or selection
     */
    deleteText(textBoxId: string, direction: 'backward' | 'forward' = 'backward'): void {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return;

        // Delete selection if any
        if (textBox.selectionStart !== undefined && textBox.selectionEnd !== undefined) {
            const start = Math.min(textBox.selectionStart, textBox.selectionEnd);
            const end = Math.max(textBox.selectionStart, textBox.selectionEnd);

            textBox.text = textBox.text.substring(0, start) + textBox.text.substring(end);
            textBox.cursorPosition = start;
            textBox.selectionStart = undefined;
            textBox.selectionEnd = undefined;

            this.adjustRangesAfterEdit(textBox, start, end - start, 0);
        } else {
            const pos = textBox.cursorPosition ?? 0;

            if (direction === 'backward' && pos > 0) {
                textBox.text = textBox.text.substring(0, pos - 1) + textBox.text.substring(pos);
                textBox.cursorPosition = pos - 1;
                this.adjustRangesAfterEdit(textBox, pos - 1, 1, 0);
            } else if (direction === 'forward' && pos < textBox.text.length) {
                textBox.text = textBox.text.substring(0, pos) + textBox.text.substring(pos + 1);
                this.adjustRangesAfterEdit(textBox, pos, 1, 0);
            }
        }

        this.emit('text:updated', { textBox, changes: { text: textBox.text } });
    }

    // ========================================================================
    // Text Measurement
    // ========================================================================

    /**
     * Measure text dimensions
     */
    measureText(text: string, style: CharacterStyle): { width: number; height: number } {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { width: 0, height: 0 };

        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px "${style.fontFamily}"`;

        const metrics = ctx.measureText(text);
        const width = metrics.width + (text.length - 1) * style.letterSpacing;
        const height = style.fontSize * 1.2; // Approximate line height

        return { width, height };
    }

    /**
     * Calculate text box dimensions based on content
     */
    calculateTextBoxSize(textBoxId: string): { width: number; height: number } {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return { width: 0, height: 0 };

        const lines = this.wrapText(textBoxId);
        let maxWidth = 0;
        let totalHeight = 0;

        for (const line of lines) {
            const { width, height } = this.measureText(line, textBox.defaultStyle);
            maxWidth = Math.max(maxWidth, width);
            totalHeight += height * textBox.paragraphStyle.lineHeight;
        }

        return { width: maxWidth, height: totalHeight };
    }

    /**
     * Wrap text to fit width
     */
    wrapText(textBoxId: string): string[] {
        const textBox = this.textBoxes.get(textBoxId);
        if (!textBox) return [];

        const words = textBox.text.split(/(\s+)/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + word;
            const { width } = this.measureText(testLine, textBox.defaultStyle);

            if (width > textBox.width && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Clear all text boxes
     */
    clear(): void {
        this.textBoxes.clear();
        this.selectedTextBoxId = null;
    }

    /**
     * Serialize all text boxes
     */
    serialize(): Record<string, unknown> {
        return {
            textBoxes: Array.from(this.textBoxes.values()),
            loadedFonts: Array.from(this.loadedFonts.values()),
        };
    }

    /**
     * Deserialize text boxes
     */
    deserialize(data: Record<string, unknown>): void {
        const { textBoxes } = data as { textBoxes: TextBox[] };

        this.textBoxes.clear();
        for (const textBox of textBoxes) {
            this.textBoxes.set(textBox.id, textBox);
        }
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private generateId(): string {
        return `txt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private mergeRanges(ranges: TextRange[]): TextRange[] {
        if (ranges.length === 0) return [];

        // Sort by start position
        ranges.sort((a, b) => a.start - b.start);

        const merged: TextRange[] = [ranges[0]];

        for (let i = 1; i < ranges.length; i++) {
            const current = ranges[i];
            const last = merged[merged.length - 1];

            if (current.start === last.end &&
                JSON.stringify(current.style) === JSON.stringify(last.style)) {
                // Merge adjacent ranges with same style
                last.end = current.end;
            } else {
                merged.push(current);
            }
        }

        return merged;
    }

    private adjustRangesAfterEdit(textBox: TextBox, position: number, deletedLength: number, insertedLength: number): void {
        const delta = insertedLength - deletedLength;

        textBox.ranges = textBox.ranges
            .map(range => {
                if (range.end <= position) {
                    // Range is before edit - no change
                    return range;
                } else if (range.start >= position + deletedLength) {
                    // Range is after edit - shift
                    return {
                        ...range,
                        start: range.start + delta,
                        end: range.end + delta,
                    };
                } else if (range.start < position && range.end > position + deletedLength) {
                    // Edit is inside range - adjust end
                    return {
                        ...range,
                        end: range.end + delta,
                    };
                } else if (range.start >= position && range.end <= position + deletedLength) {
                    // Range is deleted - remove
                    return null;
                } else {
                    // Partial overlap - complex case, simplify by removing
                    return null;
                }
            })
            .filter((r): r is TextRange => r !== null);
    }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTextToolsManager(options: { googleFontsApiKey?: string } = {}): TextToolsManager {
    return new TextToolsManager(options);
}
