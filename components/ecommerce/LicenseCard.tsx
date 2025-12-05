/**
 * License Card Component
 * Displays license information and purchase options
 */

import * as React from 'react';

export interface LicenseOption {
    type: 'personal' | 'commercial' | 'extended' | 'exclusive';
    name: string;
    description: string;
    price: number;
    features: string[];
    limitations?: string[];
    popular?: boolean;
}

interface LicenseCardProps {
    license: LicenseOption;
    selected?: boolean;
    onSelect?: () => void;
    onPurchase?: () => void;
    disabled?: boolean;
    className?: string;
}

const licenseIcons: Record<string, string> = {
    personal: '👤',
    commercial: '🏢',
    extended: '🌐',
    exclusive: '👑',
};

const licenseColors: Record<string, { bg: string; border: string; text: string }> = {
    personal: { bg: 'from-slate-600 to-slate-700', border: 'border-slate-500/30', text: 'text-slate-400' },
    commercial: { bg: 'from-indigo-600 to-indigo-700', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    extended: { bg: 'from-purple-600 to-purple-700', border: 'border-purple-500/30', text: 'text-purple-400' },
    exclusive: { bg: 'from-amber-600 to-amber-700', border: 'border-amber-500/30', text: 'text-amber-400' },
};

export const LicenseCard: React.FC<LicenseCardProps> = ({
    license,
    selected = false,
    onSelect,
    onPurchase,
    disabled = false,
    className = '',
}) => {
    const colors = licenseColors[license.type] || licenseColors.personal;

    return (
        <div
            className={`
                relative bg-[#0B0F19] rounded-2xl border transition-all duration-300
                ${selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5 hover:border-white/10'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            onClick={disabled ? undefined : onSelect}
        >
            {/* Popular Badge */}
            {license.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-lg">
                    Most Popular
                </div>
            )}

            <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-2xl shadow-lg`}>
                        {licenseIcons[license.type]}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{license.name}</h3>
                        <p className={`text-xs ${colors.text} uppercase tracking-wider`}>{license.type}</p>
                    </div>
                </div>

                {/* Price */}
                <div className="mb-4 pb-4 border-b border-white/5">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">${license.price}</span>
                        <span className="text-sm text-slate-500">one-time</span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 mb-4">{license.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                    {license.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-slate-300">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Limitations */}
                {license.limitations && license.limitations.length > 0 && (
                    <ul className="space-y-2 mb-4 pt-4 border-t border-white/5">
                        {license.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <svg className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="text-slate-500">{limitation}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Purchase Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPurchase?.();
                    }}
                    disabled={disabled}
                    className={`
                        w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all
                        ${selected
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {selected ? 'Purchase License' : 'Select'}
                </button>
            </div>

            {/* Selection Indicator */}
            {selected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
};

// License Selector Component
interface LicenseSelectorProps {
    licenses: LicenseOption[];
    selectedType?: string;
    onSelect: (license: LicenseOption) => void;
    onPurchase?: (license: LicenseOption) => void;
    className?: string;
}

export const LicenseSelector: React.FC<LicenseSelectorProps> = ({
    licenses,
    selectedType,
    onSelect,
    onPurchase,
    className = '',
}) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {licenses.map((license) => (
                <LicenseCard
                    key={license.type}
                    license={license}
                    selected={selectedType === license.type}
                    onSelect={() => onSelect(license)}
                    onPurchase={() => onPurchase?.(license)}
                />
            ))}
        </div>
    );
};

// Default license options
export const DEFAULT_LICENSE_OPTIONS: LicenseOption[] = [
    {
        type: 'personal',
        name: 'Personal',
        description: 'For personal projects and portfolios. Non-commercial use only.',
        price: 29,
        features: [
            'Personal projects',
            'Portfolio use',
            'Social media posts',
            'No attribution required',
        ],
        limitations: [
            'No commercial use',
            'No resale or redistribution',
            'Single user only',
        ],
    },
    {
        type: 'commercial',
        name: 'Commercial',
        description: 'For businesses and commercial products. Full commercial rights.',
        price: 149,
        features: [
            'Commercial products',
            'Marketing materials',
            'Client projects',
            'Unlimited prints',
            'Modify & adapt',
        ],
        limitations: [
            'No resale of design',
            'Attribution appreciated',
        ],
        popular: true,
    },
    {
        type: 'extended',
        name: 'Extended',
        description: 'For large scale commercial use and products for resale.',
        price: 499,
        features: [
            'Products for resale',
            'Unlimited production runs',
            'Multiple product lines',
            'Sublicense to manufacturers',
            'Worldwide distribution',
        ],
    },
    {
        type: 'exclusive',
        name: 'Exclusive',
        description: 'Full exclusive rights. Design removed from marketplace after purchase.',
        price: 2499,
        features: [
            'Exclusive ownership',
            'Design removed from sale',
            'Full copyright transfer',
            'Unlimited commercial use',
            'Resale rights included',
            'Priority support',
        ],
    },
];

export default LicenseCard;
