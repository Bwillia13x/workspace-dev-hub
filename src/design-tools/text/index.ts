/**
 * Text Tools Module - Professional typography system
 *
 * Provides:
 * - Rich text editing
 * - Google Fonts integration (300+ fonts)
 * - Text styling (weight, style, decoration)
 * - Text effects (outline, shadow, warp)
 * - Character and paragraph formatting
 */

export {
    TextToolsManager,
    createTextToolsManager,
    FASHION_FONTS,
    DEFAULT_CHARACTER_STYLE,
    DEFAULT_PARAGRAPH_STYLE,
    DEFAULT_TEXT_EFFECTS,
} from './text-tools';

export type {
    GoogleFontInfo,
    LoadedFont,
    CharacterStyle,
    ParagraphStyle,
    TextRange,
    TextBox,
    TextEffects,
    TextWarpType,
    TextWarp,
    TextOnPath,
    TextToolsEvents,
} from './text-tools';
