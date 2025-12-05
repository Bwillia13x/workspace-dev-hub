/**
 * Manufacturing Quote Card Component
 * Displays manufacturer information and quote requests
 */

import * as React from 'react';
import { useState } from 'react';

export interface ManufacturerData {
    id: string;
    name: string;
    description: string;
    logoUrl?: string;
    location: {
        country: string;
        city: string;
    };
    capabilities: string[];
    certifications: string[];
    minOrderQuantity: number;
    leadTimeDays: {
        sample: number;
        production: number;
    };
    qualityScore: number;
    sustainabilityScore: number;
    rating: number;
    reviewCount: number;
    verified: boolean;
}

export interface QuoteData {
    id: string;
    manufacturerId: string;
    designId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    breakdown: {
        materials: number;
        labor: number;
        overhead: number;
        shipping?: number;
    };
    leadTimeDays: number;
    validUntil: Date;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

interface ManufacturerCardProps {
    manufacturer: ManufacturerData;
    onRequestQuote?: () => void;
    onViewDetails?: () => void;
    className?: string;
}

const countryFlags: Record<string, string> = {
    CN: '🇨🇳',
    VN: '🇻🇳',
    BD: '🇧🇩',
    IN: '🇮🇳',
    TR: '🇹🇷',
    PT: '🇵🇹',
    IT: '🇮🇹',
    US: '🇺🇸',
    MX: '🇲🇽',
    TH: '🇹🇭',
    PK: '🇵🇰',
};

export const ManufacturerCard: React.FC<ManufacturerCardProps> = ({
    manufacturer,
    onRequestQuote,
    onViewDetails,
    className = '',
}) => {
    const getCapabilityColor = (capability: string): string => {
        const colors: Record<string, string> = {
            cut_and_sew: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            printing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            knitting: 'bg-green-500/10 text-green-400 border-green-500/20',
            embroidery: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            denim: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            leather: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            activewear: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            outerwear: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        };
        return colors[capability] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors ${className}`}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                        {manufacturer.logoUrl ? (
                            <img
                                src={manufacturer.logoUrl}
                                alt={manufacturer.name}
                                className="w-16 h-16 rounded-xl object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl font-bold text-white border border-white/10">
                                {manufacturer.name.charAt(0)}
                            </div>
                        )}
                        {manufacturer.verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-[#0B0F19]">
                                ✓
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg truncate">{manufacturer.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>{countryFlags[manufacturer.location.country] || '🏭'}</span>
                            <span>{manufacturer.location.city}, {manufacturer.location.country}</span>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-bold text-white">{manufacturer.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-slate-500">{manufacturer.reviewCount} reviews</span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{manufacturer.description}</p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {manufacturer.capabilities.slice(0, 4).map((cap) => (
                        <span
                            key={cap}
                            className={`px-2 py-1 text-xs rounded-lg border ${getCapabilityColor(cap)}`}
                        >
                            {cap.replace(/_/g, ' ')}
                        </span>
                    ))}
                    {manufacturer.capabilities.length > 4 && (
                        <span className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 border border-white/5">
                            +{manufacturer.capabilities.length - 4} more
                        </span>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-white/5 mb-4">
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">{manufacturer.minOrderQuantity}</div>
                        <div className="text-xs text-slate-500">Min Order</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">{manufacturer.leadTimeDays.production}d</div>
                        <div className="text-xs text-slate-500">Lead Time</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-lg font-bold text-emerald-400">{manufacturer.sustainabilityScore}</span>
                            <span className="text-xs text-slate-500">/100</span>
                        </div>
                        <div className="text-xs text-slate-500">Eco Score</div>
                    </div>
                </div>

                {/* Certifications */}
                {manufacturer.certifications.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-slate-500">Certified:</span>
                        <div className="flex gap-1">
                            {manufacturer.certifications.slice(0, 3).map((cert) => (
                                <span
                                    key={cert}
                                    className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20 uppercase tracking-wider"
                                >
                                    {cert}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onRequestQuote}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-indigo-500 hover:to-purple-500 transition-all"
                    >
                        Request Quote
                    </button>
                    <button
                        onClick={onViewDetails}
                        className="py-3 px-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all border border-white/5"
                    >
                        Details
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quote Card Component
interface QuoteCardProps {
    quote: QuoteData;
    manufacturer: ManufacturerData;
    onAccept?: () => void;
    onReject?: () => void;
    onViewDetails?: () => void;
    className?: string;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
    quote,
    manufacturer,
    onAccept,
    onReject,
    onViewDetails,
    className = '',
}) => {
    const isExpired = new Date(quote.validUntil) < new Date();
    const daysUntilExpiry = Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
        expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };

    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {manufacturer.logoUrl ? (
                            <img
                                src={manufacturer.logoUrl}
                                alt={manufacturer.name}
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold">
                                {manufacturer.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h4 className="font-bold text-white">{manufacturer.name}</h4>
                            <span className="text-xs text-slate-500">Quote #{quote.id.slice(-6)}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border uppercase tracking-wider ${statusColors[quote.status]}`}>
                        {quote.status}
                    </span>
                </div>

                {/* Price Summary */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Quantity</span>
                        <span className="font-bold text-white">{quote.quantity.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Unit Price</span>
                        <span className="font-mono text-white">${quote.unitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-sm font-bold text-slate-300">Total</span>
                        <span className="text-lg font-black text-emerald-400">${quote.totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <span className="text-xs text-slate-500">Lead Time</span>
                        <div className="font-bold text-white">{quote.leadTimeDays} days</div>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500">Valid Until</span>
                        <div className={`font-bold ${isExpired ? 'text-red-400' : daysUntilExpiry <= 3 ? 'text-amber-400' : 'text-white'}`}>
                            {isExpired ? 'Expired' : `${daysUntilExpiry} days`}
                        </div>
                    </div>
                </div>

                {/* Price Breakdown */}
                <details className="group mb-4">
                    <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400 transition-colors list-none flex items-center gap-1">
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        View Price Breakdown
                    </summary>
                    <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Materials</span>
                            <span className="text-slate-300">${quote.breakdown.materials.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Labor</span>
                            <span className="text-slate-300">${quote.breakdown.labor.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Overhead</span>
                            <span className="text-slate-300">${quote.breakdown.overhead.toLocaleString()}</span>
                        </div>
                        {quote.breakdown.shipping && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Shipping</span>
                                <span className="text-slate-300">${quote.breakdown.shipping.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </details>

                {/* Actions */}
                {quote.status === 'pending' && !isExpired && (
                    <div className="flex gap-3">
                        <button
                            onClick={onAccept}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-emerald-500 hover:to-emerald-600 transition-all"
                        >
                            Accept Quote
                        </button>
                        <button
                            onClick={onReject}
                            className="py-3 px-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all border border-white/5"
                        >
                            Decline
                        </button>
                    </div>
                )}

                {(quote.status !== 'pending' || isExpired) && (
                    <button
                        onClick={onViewDetails}
                        className="w-full py-3 px-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all border border-white/5"
                    >
                        View Details
                    </button>
                )}
            </div>
        </div>
    );
};

// Quote Request Form
interface QuoteRequestFormProps {
    manufacturer: ManufacturerData;
    designId: string;
    onSubmit: (data: { quantity: number; specifications: string; deadline?: Date }) => void;
    onCancel: () => void;
    className?: string;
}

export const QuoteRequestForm: React.FC<QuoteRequestFormProps> = ({
    manufacturer,
    designId,
    onSubmit,
    onCancel,
    className = '',
}) => {
    const [quantity, setQuantity] = useState(manufacturer.minOrderQuantity);
    const [specifications, setSpecifications] = useState('');
    const [deadline, setDeadline] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            quantity,
            specifications,
            deadline: deadline ? new Date(deadline) : undefined,
        });
    };

    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/10 ${className}`}>
            <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-bold text-white mb-1">Request Quote</h3>
                <p className="text-sm text-slate-400">Get a production quote from {manufacturer.name}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Quantity */}
                <div>
                    <label htmlFor="quantity-input" className="block text-sm font-medium text-slate-300 mb-2">
                        Quantity
                        <span className="text-slate-500 font-normal"> (min: {manufacturer.minOrderQuantity})</span>
                    </label>
                    <input
                        id="quantity-input"
                        type="number"
                        min={manufacturer.minOrderQuantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(manufacturer.minOrderQuantity, parseInt(e.target.value) || 0))}
                        title="Enter order quantity"
                        aria-label="Order quantity"
                        placeholder="Enter quantity"
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Specifications */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Specifications & Requirements
                    </label>
                    <textarea
                        value={specifications}
                        onChange={(e) => setSpecifications(e.target.value)}
                        rows={4}
                        placeholder="Describe materials, colors, sizes, and any special requirements..."
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none"
                    />
                </div>

                {/* Deadline */}
                <div>
                    <label htmlFor="deadline-input" className="block text-sm font-medium text-slate-300 mb-2">
                        Desired Delivery Date
                        <span className="text-slate-500 font-normal"> (optional)</span>
                    </label>
                    <input
                        id="deadline-input"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        min={new Date(Date.now() + manufacturer.leadTimeDays.production * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        title="Select desired delivery date"
                        aria-label="Desired delivery date"
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Info */}
                <div className="bg-slate-800/30 rounded-xl p-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Quote Estimate
                    </div>
                    <p className="text-slate-500">
                        You'll receive a detailed quote within 24-48 hours. The manufacturer may contact you for additional details.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-indigo-500 hover:to-purple-500 transition-all"
                    >
                        Submit Request
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="py-3 px-6 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all border border-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManufacturerCard;
