/**
 * Designer Profile Card Component
 * Displays designer information, stats, and badges
 */

import React from 'react';

export interface DesignerProfileData {
    id: string;
    userId: string;
    displayName: string;
    bio: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    specialties: string[];
    location?: string;
    website?: string;
    socialLinks: {
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        behance?: string;
        dribbble?: string;
    };
    stats: {
        totalDesigns: number;
        totalSales: number;
        totalEarnings: number;
        averageRating: number;
        reviewCount: number;
        followers: number;
        following: number;
    };
    badges: string[];
    verified: boolean;
    createdAt: Date;
}

interface DesignerProfileCardProps {
    designer: DesignerProfileData;
    variant?: 'compact' | 'full' | 'minimal';
    onFollow?: () => void;
    onMessage?: () => void;
    onViewProfile?: () => void;
    isFollowing?: boolean;
    className?: string;
}

export const DesignerProfileCard: React.FC<DesignerProfileCardProps> = ({
    designer,
    variant = 'compact',
    onFollow,
    onMessage,
    onViewProfile,
    isFollowing = false,
    className = '',
}) => {
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const getBadgeIcon = (badge: string): string => {
        const icons: Record<string, string> = {
            'verified-business': '✓',
            'verified-identity': '🛡️',
            'trusted-seller': '⭐',
            'experienced-seller': '🏆',
            'highly-rated': '💎',
            'fast-responder': '⚡',
            'top-seller': '🔥',
        };
        return icons[badge] || '🏅';
    };

    if (variant === 'minimal') {
        return (
            <div
                className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
                onClick={onViewProfile}
            >
                <div className="relative">
                    {designer.avatarUrl ? (
                        <img
                            src={designer.avatarUrl}
                            alt={designer.displayName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {designer.displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {designer.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] border-2 border-[#0B0F19]">
                            ✓
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{designer.displayName}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                        {formatNumber(designer.stats.followers)} followers
                    </span>
                </div>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div
                className={`bg-[#0B0F19] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-colors ${className}`}
            >
                <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                        {designer.avatarUrl ? (
                            <img
                                src={designer.avatarUrl}
                                alt={designer.displayName}
                                className="w-16 h-16 rounded-xl object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                                {designer.displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {designer.verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-[#0B0F19]">
                                ✓
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3
                                className="font-bold text-white truncate cursor-pointer hover:text-indigo-400 transition-colors"
                                onClick={onViewProfile}
                            >
                                {designer.displayName}
                            </h3>
                            {designer.badges.slice(0, 2).map((badge) => (
                                <span
                                    key={badge}
                                    className="text-xs"
                                    title={badge.replace(/-/g, ' ')}
                                >
                                    {getBadgeIcon(badge)}
                                </span>
                            ))}
                        </div>

                        {designer.specialties.length > 0 && (
                            <p className="text-xs text-slate-500 mb-2 truncate">
                                {designer.specialties.slice(0, 3).join(' · ')}
                            </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {designer.stats.averageRating.toFixed(1)}
                            </span>
                            <span>{formatNumber(designer.stats.totalSales)} sales</span>
                            <span>{formatNumber(designer.stats.followers)} followers</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onFollow}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isFollowing
                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                            }`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    {onMessage && (
                        <button
                            onClick={onMessage}
                            className="py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
                        >
                            Message
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Full variant
    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            {/* Cover Image */}
            <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
                {designer.coverImageUrl && (
                    <img
                        src={designer.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent" />
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6 -mt-12 relative">
                <div className="flex items-end gap-4 mb-4">
                    <div className="relative">
                        {designer.avatarUrl ? (
                            <img
                                src={designer.avatarUrl}
                                alt={designer.displayName}
                                className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0B0F19]"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-[#0B0F19]">
                                {designer.displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {designer.verified && (
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm border-3 border-[#0B0F19]">
                                ✓
                            </div>
                        )}
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-white">{designer.displayName}</h2>
                            <div className="flex gap-1">
                                {designer.badges.map((badge) => (
                                    <span
                                        key={badge}
                                        className="text-sm"
                                        title={badge.replace(/-/g, ' ')}
                                    >
                                        {getBadgeIcon(badge)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {designer.location && (
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {designer.location}
                            </p>
                        )}
                    </div>
                </div>

                {/* Bio */}
                {designer.bio && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{designer.bio}</p>
                )}

                {/* Specialties */}
                {designer.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {designer.specialties.map((specialty) => (
                            <span
                                key={specialty}
                                className="px-3 py-1 bg-slate-800/50 text-slate-400 text-xs rounded-full border border-white/5"
                            >
                                {specialty}
                            </span>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 py-4 border-t border-b border-white/5 mb-4">
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">
                            {formatNumber(designer.stats.totalDesigns)}
                        </div>
                        <div className="text-xs text-slate-500">Designs</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">
                            {formatNumber(designer.stats.totalSales)}
                        </div>
                        <div className="text-xs text-slate-500">Sales</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">
                            {formatNumber(designer.stats.followers)}
                        </div>
                        <div className="text-xs text-slate-500">Followers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {designer.stats.averageRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500">Rating</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onFollow}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${isFollowing
                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-white/10'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
                            }`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    {onMessage && (
                        <button
                            onClick={onMessage}
                            className="py-3 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-white/10"
                        >
                            Message
                        </button>
                    )}
                    <button
                        onClick={onViewProfile}
                        className="py-3 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-white/10"
                    >
                        View
                    </button>
                </div>

                {/* Social Links */}
                {Object.values(designer.socialLinks).some(Boolean) && (
                    <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-white/5">
                        {designer.socialLinks.instagram && (
                            <a
                                href={designer.socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Instagram"
                                aria-label="Visit Instagram profile"
                                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-400 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                        )}
                        {designer.socialLinks.twitter && (
                            <a
                                href={designer.socialLinks.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Twitter"
                                aria-label="Visit Twitter profile"
                                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                            </a>
                        )}
                        {designer.socialLinks.behance && (
                            <a
                                href={designer.socialLinks.behance}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Behance"
                                aria-label="Visit Behance profile"
                                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z" />
                                </svg>
                            </a>
                        )}
                        {designer.website && (
                            <a
                                href={designer.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Website"
                                aria-label="Visit designer website"
                                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DesignerProfileCard;
