/**
 * Prompt Engineering Assistant
 *
 * AI-powered prompt optimization that scores prompts and suggests improvements
 * to help users create better fashion design generations.
 */

/**
 * Prompt quality score breakdown
 */
export interface PromptScore {
    /** Overall score 0-100 */
    overall: number;
    /** Specificity score - how detailed is the prompt */
    specificity: number;
    /** Clarity score - how clear and unambiguous */
    clarity: number;
    /** Fashion relevance - how fashion-specific */
    fashionRelevance: number;
    /** Technical detail - construction/material details */
    technicalDetail: number;
    /** Visual description - colors, textures, silhouettes */
    visualDescription: number;
}

/**
 * Suggestion for prompt improvement
 */
export interface PromptSuggestion {
    /** Suggestion type */
    type:
    | 'add_detail'
    | 'be_specific'
    | 'add_color'
    | 'add_material'
    | 'add_style'
    | 'add_context'
    | 'remove_ambiguity'
    | 'technical_term';
    /** Human-readable suggestion */
    message: string;
    /** Example addition or replacement */
    example?: string;
    /** Priority (higher = more important) */
    priority: number;
}

/**
 * Enhanced prompt result
 */
export interface EnhancedPrompt {
    /** Original prompt */
    original: string;
    /** Enhanced version */
    enhanced: string;
    /** What was added/changed */
    changes: string[];
    /** Estimated quality improvement */
    improvement: number;
}

/**
 * Prompt analysis result
 */
export interface PromptAnalysis {
    /** Quality scores */
    score: PromptScore;
    /** Improvement suggestions */
    suggestions: PromptSuggestion[];
    /** Auto-enhanced version */
    enhanced: EnhancedPrompt;
    /** Detected fashion category */
    category?: string;
    /** Detected garment type */
    garmentType?: string;
    /** Detected style keywords */
    detectedKeywords: string[];
}

/**
 * Fashion-specific vocabulary for prompt enhancement
 */
const FASHION_VOCABULARY = {
    garmentTypes: [
        'dress',
        'gown',
        'blouse',
        'shirt',
        'top',
        'sweater',
        'cardigan',
        'jacket',
        'coat',
        'blazer',
        'vest',
        'pants',
        'trousers',
        'jeans',
        'shorts',
        'skirt',
        'jumpsuit',
        'romper',
        'suit',
        'bodysuit',
    ],
    materials: [
        'silk',
        'satin',
        'velvet',
        'cotton',
        'linen',
        'wool',
        'cashmere',
        'denim',
        'leather',
        'suede',
        'chiffon',
        'organza',
        'tulle',
        'lace',
        'tweed',
        'jersey',
        'crepe',
        'brocade',
        'taffeta',
        'sequin',
    ],
    styles: [
        'minimalist',
        'bohemian',
        'vintage',
        'modern',
        'classic',
        'avant-garde',
        'streetwear',
        'casual',
        'formal',
        'athleisure',
        'romantic',
        'edgy',
        'preppy',
        'grunge',
        'elegant',
        'chic',
        'sophisticated',
        'playful',
        'dramatic',
        'understated',
    ],
    silhouettes: [
        'A-line',
        'empire waist',
        'fit and flare',
        'bodycon',
        'oversized',
        'tailored',
        'relaxed',
        'structured',
        'flowing',
        'draped',
        'asymmetrical',
        'wrap',
        'column',
        'mermaid',
        'ball gown',
        'sheath',
        'shift',
        'trapeze',
    ],
    necklines: [
        'V-neck',
        'crew neck',
        'scoop neck',
        'boat neck',
        'halter',
        'off-shoulder',
        'one-shoulder',
        'sweetheart',
        'square neck',
        'mock neck',
        'turtleneck',
        'cowl neck',
        'keyhole',
        'plunging',
        'collared',
    ],
    sleeves: [
        'sleeveless',
        'cap sleeve',
        'short sleeve',
        'three-quarter sleeve',
        'long sleeve',
        'bell sleeve',
        'bishop sleeve',
        'puff sleeve',
        'balloon sleeve',
        'flutter sleeve',
        'dolman sleeve',
        'raglan sleeve',
        'kimono sleeve',
    ],
    lengths: [
        'mini',
        'above-knee',
        'knee-length',
        'midi',
        'maxi',
        'floor-length',
        'cropped',
        'ankle-length',
        'full-length',
        'tea-length',
    ],
    details: [
        'pleated',
        'ruffled',
        'embroidered',
        'beaded',
        'sequined',
        'printed',
        'striped',
        'checked',
        'floral',
        'geometric',
        'tie-dye',
        'ombre',
        'color-blocked',
        'quilted',
        'textured',
        'smocked',
        'gathered',
        'pintucked',
    ],
    colors: [
        'black',
        'white',
        'ivory',
        'cream',
        'beige',
        'navy',
        'burgundy',
        'emerald',
        'sapphire',
        'ruby',
        'blush',
        'coral',
        'teal',
        'olive',
        'mustard',
        'lavender',
        'sage',
        'terracotta',
        'champagne',
        'charcoal',
    ],
    occasions: [
        'everyday',
        'office',
        'cocktail',
        'evening',
        'wedding',
        'beach',
        'resort',
        'festival',
        'gala',
        'red carpet',
        'brunch',
        'date night',
        'business',
        'weekend',
    ],
};

/**
 * Patterns that indicate good prompt structure
 */
const QUALITY_PATTERNS = {
    hasColor: /\b(color|colou?red?|hue|shade|tone|black|white|red|blue|green|yellow|pink|purple|orange|brown|grey|gray|navy|beige|cream|ivory)\b/i,
    hasMaterial:
        /\b(silk|satin|velvet|cotton|linen|wool|cashmere|denim|leather|suede|chiffon|organza|tulle|lace|tweed|jersey|crepe|fabric|textile)\b/i,
    hasStyle:
        /\b(minimalist|bohemian|boho|vintage|modern|classic|avant-garde|streetwear|casual|formal|elegant|chic|sophisticated)\b/i,
    hasSilhouette:
        /\b(A-line|empire|fit and flare|bodycon|oversized|tailored|relaxed|structured|flowing|draped|asymmetric)\b/i,
    hasGarment:
        /\b(dress|gown|blouse|shirt|top|sweater|jacket|coat|blazer|pants|trousers|skirt|jumpsuit|suit)\b/i,
    hasDetail:
        /\b(pleated|ruffled|embroidered|beaded|sequined|printed|striped|floral|geometric|textured)\b/i,
    hasContext:
        /\b(for|wearing|occasion|event|season|spring|summer|fall|winter|evening|daytime|office|casual)\b/i,
    hasLength: /\b(mini|midi|maxi|cropped|ankle|floor-length|knee|above-knee)\b/i,
};

/**
 * Words that reduce prompt clarity
 */
const AMBIGUOUS_TERMS = [
    'nice',
    'good',
    'pretty',
    'beautiful',
    'cool',
    'awesome',
    'amazing',
    'great',
    'cute',
    'lovely',
    'something',
    'stuff',
    'thing',
    'kind of',
    'sort of',
    'maybe',
    'probably',
    'like',
    'basically',
];

/**
 * Prompt Engineering Assistant class
 */
export class PromptAssistant {
    /**
     * Analyze a prompt and provide scores and suggestions
     */
    analyzePrompt(prompt: string): PromptAnalysis {
        const normalizedPrompt = prompt.toLowerCase().trim();
        const words = normalizedPrompt.split(/\s+/);

        // Calculate individual scores
        const specificity = this.calculateSpecificity(normalizedPrompt, words);
        const clarity = this.calculateClarity(normalizedPrompt, words);
        const fashionRelevance = this.calculateFashionRelevance(normalizedPrompt);
        const technicalDetail = this.calculateTechnicalDetail(normalizedPrompt);
        const visualDescription = this.calculateVisualDescription(normalizedPrompt);

        // Calculate overall score (weighted average)
        const overall = Math.round(
            specificity * 0.2 +
            clarity * 0.15 +
            fashionRelevance * 0.25 +
            technicalDetail * 0.15 +
            visualDescription * 0.25
        );

        const score: PromptScore = {
            overall,
            specificity,
            clarity,
            fashionRelevance,
            technicalDetail,
            visualDescription,
        };

        // Generate suggestions
        const suggestions = this.generateSuggestions(normalizedPrompt, score);

        // Create enhanced version
        const enhanced = this.enhancePrompt(prompt, suggestions);

        // Detect category and keywords
        const detectedKeywords = this.detectKeywords(normalizedPrompt);
        const garmentType = this.detectGarmentType(normalizedPrompt);
        const category = this.detectCategory(normalizedPrompt);

        return {
            score,
            suggestions,
            enhanced,
            category,
            garmentType,
            detectedKeywords,
        };
    }

    /**
     * Calculate specificity score
     */
    private calculateSpecificity(prompt: string, words: string[]): number {
        let score = 50; // Base score

        // Length bonus (longer prompts tend to be more specific)
        if (words.length >= 10) score += 15;
        else if (words.length >= 5) score += 10;
        else if (words.length >= 3) score += 5;

        // Specific details bonus
        if (QUALITY_PATTERNS.hasColor.test(prompt)) score += 10;
        if (QUALITY_PATTERNS.hasMaterial.test(prompt)) score += 10;
        if (QUALITY_PATTERNS.hasSilhouette.test(prompt)) score += 10;
        if (QUALITY_PATTERNS.hasDetail.test(prompt)) score += 10;
        if (QUALITY_PATTERNS.hasLength.test(prompt)) score += 5;

        // Numeric specificity (measurements, quantities)
        if (/\d+/.test(prompt)) score += 5;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate clarity score
     */
    private calculateClarity(prompt: string, words: string[]): number {
        let score = 70; // Base score

        // Penalize ambiguous terms
        const ambiguousCount = AMBIGUOUS_TERMS.filter((term) =>
            prompt.includes(term)
        ).length;
        score -= ambiguousCount * 10;

        // Penalize very short prompts
        if (words.length < 3) score -= 20;

        // Penalize excessive punctuation or caps
        const capsRatio =
            (prompt.match(/[A-Z]/g) || []).length / Math.max(prompt.length, 1);
        if (capsRatio > 0.5) score -= 15;

        // Bonus for proper sentence structure
        if (/^[A-Z]/.test(prompt) && /[.!?]$/.test(prompt)) score += 5;

        // Penalize repetition
        const uniqueWords = new Set(words);
        if (uniqueWords.size < words.length * 0.7) score -= 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate fashion relevance score
     */
    private calculateFashionRelevance(prompt: string): number {
        let score = 30; // Base score

        // Check for garment type
        if (QUALITY_PATTERNS.hasGarment.test(prompt)) score += 25;

        // Check for style
        if (QUALITY_PATTERNS.hasStyle.test(prompt)) score += 15;

        // Check for material
        if (QUALITY_PATTERNS.hasMaterial.test(prompt)) score += 15;

        // Check for context/occasion
        if (QUALITY_PATTERNS.hasContext.test(prompt)) score += 10;

        // Check vocabulary matches
        const allTerms = [
            ...FASHION_VOCABULARY.garmentTypes,
            ...FASHION_VOCABULARY.materials,
            ...FASHION_VOCABULARY.styles,
        ];

        const matchCount = allTerms.filter((term) =>
            prompt.toLowerCase().includes(term.toLowerCase())
        ).length;

        score += Math.min(matchCount * 5, 20);

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate technical detail score
     */
    private calculateTechnicalDetail(prompt: string): number {
        let score = 40; // Base score

        // Check for construction details
        if (QUALITY_PATTERNS.hasDetail.test(prompt)) score += 20;
        if (QUALITY_PATTERNS.hasSilhouette.test(prompt)) score += 15;
        if (QUALITY_PATTERNS.hasLength.test(prompt)) score += 10;

        // Check for neckline/sleeve mentions
        const hasNeckline = FASHION_VOCABULARY.necklines.some((n) =>
            prompt.toLowerCase().includes(n.toLowerCase())
        );
        const hasSleeve = FASHION_VOCABULARY.sleeves.some((s) =>
            prompt.toLowerCase().includes(s.toLowerCase())
        );

        if (hasNeckline) score += 10;
        if (hasSleeve) score += 10;

        // Measurements or sizing
        if (/\b(size|measurement|inch|cm|waist|bust|hip|length)\b/i.test(prompt)) {
            score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate visual description score
     */
    private calculateVisualDescription(prompt: string): number {
        let score = 40; // Base score

        // Color description
        if (QUALITY_PATTERNS.hasColor.test(prompt)) score += 20;

        // Multiple colors
        const colorMatches = FASHION_VOCABULARY.colors.filter((c) =>
            prompt.toLowerCase().includes(c)
        );
        if (colorMatches.length > 1) score += 10;

        // Texture/pattern
        if (QUALITY_PATTERNS.hasDetail.test(prompt)) score += 15;

        // Visual style keywords
        const visualKeywords = [
            'shiny',
            'matte',
            'glossy',
            'textured',
            'smooth',
            'soft',
            'crisp',
            'fluid',
            'structured',
        ];
        if (visualKeywords.some((k) => prompt.toLowerCase().includes(k)))
            score += 10;

        // Photography/rendering style
        if (
            /\b(studio|photorealistic|fashion photography|editorial|lookbook)\b/i.test(
                prompt
            )
        ) {
            score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Generate improvement suggestions based on analysis
     */
    private generateSuggestions(
        prompt: string,
        score: PromptScore
    ): PromptSuggestion[] {
        const suggestions: PromptSuggestion[] = [];

        // Missing garment type
        if (!QUALITY_PATTERNS.hasGarment.test(prompt)) {
            suggestions.push({
                type: 'be_specific',
                message: 'Specify the garment type (dress, blouse, jacket, etc.)',
                example: `${prompt}, specifically a ${this.getRandomItem(FASHION_VOCABULARY.garmentTypes)}`,
                priority: 10,
            });
        }

        // Missing color
        if (!QUALITY_PATTERNS.hasColor.test(prompt)) {
            suggestions.push({
                type: 'add_color',
                message: 'Add color specification for better results',
                example: `${prompt} in ${this.getRandomItem(FASHION_VOCABULARY.colors)}`,
                priority: 9,
            });
        }

        // Missing material
        if (!QUALITY_PATTERNS.hasMaterial.test(prompt)) {
            suggestions.push({
                type: 'add_material',
                message: 'Specify fabric or material for realistic rendering',
                example: `${prompt} made of ${this.getRandomItem(FASHION_VOCABULARY.materials)}`,
                priority: 8,
            });
        }

        // Missing style
        if (!QUALITY_PATTERNS.hasStyle.test(prompt)) {
            suggestions.push({
                type: 'add_style',
                message: 'Add a style descriptor for clearer direction',
                example: `${this.getRandomItem(FASHION_VOCABULARY.styles)} ${prompt}`,
                priority: 7,
            });
        }

        // Missing silhouette
        if (
            !QUALITY_PATTERNS.hasSilhouette.test(prompt) &&
            QUALITY_PATTERNS.hasGarment.test(prompt)
        ) {
            suggestions.push({
                type: 'add_detail',
                message: 'Describe the silhouette or fit',
                example: `${prompt} with ${this.getRandomItem(FASHION_VOCABULARY.silhouettes)} silhouette`,
                priority: 6,
            });
        }

        // Low clarity - check for ambiguous terms
        if (score.clarity < 60) {
            const foundAmbiguous = AMBIGUOUS_TERMS.filter((term) =>
                prompt.toLowerCase().includes(term)
            );
            if (foundAmbiguous.length > 0) {
                suggestions.push({
                    type: 'remove_ambiguity',
                    message: `Replace vague terms like "${foundAmbiguous[0]}" with specific descriptions`,
                    priority: 8,
                });
            }
        }

        // Missing context
        if (!QUALITY_PATTERNS.hasContext.test(prompt)) {
            suggestions.push({
                type: 'add_context',
                message: 'Add occasion or context for better style matching',
                example: `${prompt} for ${this.getRandomItem(FASHION_VOCABULARY.occasions)}`,
                priority: 5,
            });
        }

        // Technical terminology
        if (score.technicalDetail < 50) {
            suggestions.push({
                type: 'technical_term',
                message: 'Add construction details like neckline or sleeve style',
                example: `${prompt} with ${this.getRandomItem(FASHION_VOCABULARY.necklines)} and ${this.getRandomItem(FASHION_VOCABULARY.sleeves)}`,
                priority: 4,
            });
        }

        // Sort by priority
        return suggestions.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Auto-enhance a prompt based on suggestions
     */
    enhancePrompt(
        original: string,
        suggestions: PromptSuggestion[]
    ): EnhancedPrompt {
        let enhanced = original;
        const changes: string[] = [];

        // Apply top suggestions (max 3-4 to avoid over-enhancement)
        const topSuggestions = suggestions.slice(0, 4);

        for (const suggestion of topSuggestions) {
            switch (suggestion.type) {
                case 'add_color':
                    if (!QUALITY_PATTERNS.hasColor.test(enhanced)) {
                        const color = this.getRandomItem(FASHION_VOCABULARY.colors);
                        enhanced = `${enhanced} in ${color}`;
                        changes.push(`Added color: ${color}`);
                    }
                    break;

                case 'add_material':
                    if (!QUALITY_PATTERNS.hasMaterial.test(enhanced)) {
                        const material = this.getRandomItem(FASHION_VOCABULARY.materials);
                        enhanced = `${enhanced} made of ${material}`;
                        changes.push(`Added material: ${material}`);
                    }
                    break;

                case 'add_style':
                    if (!QUALITY_PATTERNS.hasStyle.test(enhanced)) {
                        const style = this.getRandomItem(FASHION_VOCABULARY.styles);
                        enhanced = `${style} ${enhanced}`;
                        changes.push(`Added style: ${style}`);
                    }
                    break;

                case 'add_context':
                    if (!QUALITY_PATTERNS.hasContext.test(enhanced)) {
                        const occasion = this.getRandomItem(FASHION_VOCABULARY.occasions);
                        enhanced = `${enhanced} for ${occasion}`;
                        changes.push(`Added context: ${occasion}`);
                    }
                    break;
            }
        }

        // Add standard quality suffixes if not present
        if (!/\b(photorealistic|studio|photography)\b/i.test(enhanced)) {
            enhanced = `${enhanced}, photorealistic fashion photography`;
            changes.push('Added photography style');
        }

        // Calculate improvement
        const originalScore = this.analyzePromptQuick(original);
        const enhancedScore = this.analyzePromptQuick(enhanced);
        const improvement = Math.max(0, enhancedScore - originalScore);

        return {
            original,
            enhanced: enhanced.trim(),
            changes,
            improvement,
        };
    }

    /**
     * Quick score calculation for comparison
     */
    private analyzePromptQuick(prompt: string): number {
        const normalized = prompt.toLowerCase();
        let score = 30;

        if (QUALITY_PATTERNS.hasGarment.test(normalized)) score += 15;
        if (QUALITY_PATTERNS.hasColor.test(normalized)) score += 15;
        if (QUALITY_PATTERNS.hasMaterial.test(normalized)) score += 15;
        if (QUALITY_PATTERNS.hasStyle.test(normalized)) score += 10;
        if (QUALITY_PATTERNS.hasContext.test(normalized)) score += 10;
        if (QUALITY_PATTERNS.hasSilhouette.test(normalized)) score += 5;

        return Math.min(100, score);
    }

    /**
     * Detect keywords in the prompt
     */
    private detectKeywords(prompt: string): string[] {
        const keywords: string[] = [];
        const normalized = prompt.toLowerCase();

        const allVocab = Object.values(FASHION_VOCABULARY).flat();
        for (const term of allVocab) {
            if (normalized.includes(term.toLowerCase())) {
                keywords.push(term);
            }
        }

        return [...new Set(keywords)];
    }

    /**
     * Detect the garment type from prompt
     */
    private detectGarmentType(prompt: string): string | undefined {
        const normalized = prompt.toLowerCase();
        return FASHION_VOCABULARY.garmentTypes.find((g) =>
            normalized.includes(g.toLowerCase())
        );
    }

    /**
     * Detect fashion category
     */
    private detectCategory(prompt: string): string | undefined {
        const normalized = prompt.toLowerCase();

        if (
            /\b(evening|gala|cocktail|formal|gown|ball)\b/.test(normalized)
        ) {
            return 'Evening/Formal';
        }
        if (/\b(casual|everyday|weekend|relaxed)\b/.test(normalized)) {
            return 'Casual';
        }
        if (/\b(office|business|professional|work)\b/.test(normalized)) {
            return 'Business/Professional';
        }
        if (/\b(athletic|sport|gym|workout|athleisure)\b/.test(normalized)) {
            return 'Athletic/Sportswear';
        }
        if (/\b(bridal|wedding|bride)\b/.test(normalized)) {
            return 'Bridal';
        }
        if (/\b(streetwear|urban|street)\b/.test(normalized)) {
            return 'Streetwear';
        }
        if (/\b(vintage|retro|classic)\b/.test(normalized)) {
            return 'Vintage/Retro';
        }

        return undefined;
    }

    /**
     * Get a random item from an array
     */
    private getRandomItem<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Get suggested prompts based on partial input
     */
    getSuggestions(partialPrompt: string, count: number = 5): string[] {
        const suggestions: string[] = [];
        const normalized = partialPrompt.toLowerCase().trim();

        if (!normalized) {
            // Return popular starter prompts
            return [
                'Elegant evening gown in deep burgundy silk',
                'Minimalist white linen summer dress',
                'Structured navy blazer with gold buttons',
                'Bohemian maxi skirt with floral print',
                'Modern streetwear hoodie with geometric patterns',
            ].slice(0, count);
        }

        // Add completions based on detected garment
        const garment = this.detectGarmentType(normalized);
        if (garment) {
            // Suggest variations
            suggestions.push(
                `${partialPrompt} in ${this.getRandomItem(FASHION_VOCABULARY.colors)} ${this.getRandomItem(FASHION_VOCABULARY.materials)}`,
                `${this.getRandomItem(FASHION_VOCABULARY.styles)} ${partialPrompt}`,
                `${partialPrompt} with ${this.getRandomItem(FASHION_VOCABULARY.details)} details`
            );
        } else {
            // Suggest adding garment type
            FASHION_VOCABULARY.garmentTypes.slice(0, 3).forEach((g) => {
                suggestions.push(`${partialPrompt} ${g}`);
            });
        }

        return suggestions.slice(0, count);
    }
}

/**
 * Export singleton instance
 */
export const promptAssistant = new PromptAssistant();
