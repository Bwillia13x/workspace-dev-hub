/**
 * Trust Badge Components
 * Displays trust indicators for designers and marketplace items
 */

import * as React from 'react';
import type { DesignerBadge, DisputeStatus } from '../../src/ecommerce/types';

// Trust tiers for the platform
export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Badge configuration
const BADGE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    verified_identity: {
        icon: '✓',
        label: 'Verified Identity',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    verified_portfolio: {
        icon: '📁',
        label: 'Verified Portfolio',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    top_seller: {
        icon: '⭐',
        label: 'Top Seller',
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    featured_designer: {
        icon: '🏆',
        label: 'Featured Designer',
        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    original_creator: {
        icon: '🎨',
        label: 'Original Creator',
        color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    },
    fast_response: {
        icon: '⚡',
        label: 'Fast Response',
        color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    quality_assured: {
        icon: '✔️',
        label: 'Quality Assured',
        color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    eco_friendly: {
        icon: '🌱',
        label: 'Eco-Friendly',
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
};

const TIER_CONFIG: Record<TrustTier, { label: string; color: string; icon: string }> = {
    bronze: {
        label: 'Bronze',
        color: 'from-orange-700 to-orange-900',
        icon: '🥉',
    },
    silver: {
        label: 'Silver',
        color: 'from-slate-300 to-slate-500',
        icon: '🥈',
    },
    gold: {
        label: 'Gold',
        color: 'from-yellow-400 to-yellow-600',
        icon: '🥇',
    },
    platinum: {
        label: 'Platinum',
        color: 'from-cyan-300 to-cyan-500',
        icon: '💎',
    },
};

// Single Trust Badge Component
interface TrustBadgeProps {
    badge: DesignerBadge;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
    badge,
    size = 'md',
    showLabel = true,
    className = '',
}) => {
    const config = BADGE_CONFIG[badge.type] || {
        icon: '🏅',
        label: badge.type.replace(/_/g, ' '),
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    };

    return (
        <div
            className={`inline-flex items-center gap-1.5 rounded-full border ${config.color} ${sizeClasses[size]} ${className}`}
            title={`Earned ${new Date(badge.earnedAt).toLocaleDateString()}`}
        >
            <span>{config.icon}</span>
            {showLabel && <span className="capitalize">{config.label}</span>}
        </div>
    );
};

// Trust Tier Badge
interface TrustTierBadgeProps {
    tier: TrustTier;
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showScore?: boolean;
    className?: string;
}

export const TrustTierBadge: React.FC<TrustTierBadgeProps> = ({
    tier,
    score,
    size = 'md',
    showScore = true,
    className = '',
}) => {
    const config = TIER_CONFIG[tier];

    const sizeClasses = {
        sm: 'text-xs px-3 py-1',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-5 py-3',
    };

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${config.color} text-white font-bold ${sizeClasses[size]} ${className}`}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
            {showScore && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                    {score}
                </span>
            )}
        </div>
    );
};

// Trust Score Display
interface TrustScoreDisplayProps {
    score: number;
    tier: TrustTier;
    breakdown?: {
        salesHistory: number;
        customerRatings: number;
        responseTime: number;
        disputeResolution: number;
        accountAge: number;
    };
    size?: 'compact' | 'full';
    className?: string;
}

export const TrustScoreDisplay: React.FC<TrustScoreDisplayProps> = ({
    score,
    tier,
    breakdown,
    size = 'compact',
    className = '',
}) => {
    const tierConfig = TIER_CONFIG[tier];
    const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : tier === 'gold' ? 'platinum' : null;
    const nextTierThreshold = tier === 'bronze' ? 50 : tier === 'silver' ? 70 : tier === 'gold' ? 90 : 100;

    if (size === 'compact') {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tierConfig.color} flex items-center justify-center text-lg`}>
                    {tierConfig.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{score}</span>
                        <span className="text-xs text-slate-500">Trust Score</span>
                    </div>
                    <span className={`text-xs bg-gradient-to-r ${tierConfig.color} bg-clip-text text-transparent font-bold`}>
                        {tierConfig.label} Tier
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tierConfig.color} flex items-center justify-center text-3xl`}>
                            {tierConfig.icon}
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white">{score}</div>
                            <div className="text-sm text-slate-400">Trust Score</div>
                        </div>
                    </div>
                    <TrustTierBadge tier={tier} score={score} showScore={false} />
                </div>

                {/* Progress to next tier */}
                {nextTier && (
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>Progress to {TIER_CONFIG[nextTier].label}</span>
                            <span>{score}/{nextTierThreshold}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${TIER_CONFIG[nextTier].color} transition-all duration-500`}
                                style={{ width: `${Math.min(100, (score / nextTierThreshold) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Breakdown */}
                {breakdown && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-300">Score Breakdown</h4>
                        {Object.entries(breakdown).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-500"
                                            style={{ width: `${value}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-white w-8 text-right">{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Badge Collection Display
interface BadgeCollectionProps {
    badges: DesignerBadge[];
    maxDisplay?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({
    badges,
    maxDisplay = 5,
    size = 'sm',
    className = '',
}) => {
    const displayBadges = badges.slice(0, maxDisplay);
    const remainingCount = badges.length - maxDisplay;

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {displayBadges.map((badge) => (
                <TrustBadge key={badge.type} badge={badge} size={size} showLabel={size !== 'sm'} />
            ))}
            {remainingCount > 0 && (
                <span className="inline-flex items-center text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded-full">
                    +{remainingCount} more
                </span>
            )}
        </div>
    );
};

// Dispute Status Badge
interface DisputeStatusBadgeProps {
    status: DisputeStatus;
    className?: string;
}

const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    under_review: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    awaiting_response: { label: 'Awaiting Response', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    escalated: { label: 'Escalated', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    closed: { label: 'Closed', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export const DisputeStatusBadge: React.FC<DisputeStatusBadgeProps> = ({
    status,
    className = '',
}) => {
    const config = DISPUTE_STATUS_CONFIG[status];

    return (
        <span className={`inline-flex items-center px-3 py-1 text-xs rounded-full border ${config.color} ${className}`}>
            {config.label}
        </span>
    );
};

// Verification Status Indicator
interface VerificationStatusProps {
    isVerified: boolean;
    verificationType?: 'identity' | 'portfolio' | 'business';
    size?: 'sm' | 'md';
    className?: string;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({
    isVerified,
    verificationType = 'identity',
    size = 'md',
    className = '',
}) => {
    const icons = {
        identity: '🪪',
        portfolio: '📁',
        business: '🏢',
    };

    const sizeClasses = {
        sm: 'w-5 h-5 text-xs',
        md: 'w-6 h-6 text-sm',
    };

    if (!isVerified) {
        return (
            <div className={`${sizeClasses[size]} rounded-full bg-slate-700 flex items-center justify-center text-slate-500 ${className}`}>
                ?
            </div>
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-emerald-500 flex items-center justify-center ${className}`}
            title={`${verificationType.charAt(0).toUpperCase() + verificationType.slice(1)} Verified`}
        >
            {size === 'sm' ? '✓' : icons[verificationType]}
        </div>
    );
};

export default TrustBadge;
