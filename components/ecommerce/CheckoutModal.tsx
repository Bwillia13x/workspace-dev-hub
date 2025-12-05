/**
 * Checkout Modal Component
 * Handles the checkout flow for purchasing designs
 */

import * as React from 'react';
import { useState } from 'react';
import type { LicenseType } from '../../src/ecommerce/types';

export interface CheckoutItem {
    designId: string;
    designName: string;
    designImageUrl: string;
    creatorName: string;
    licenseType: LicenseType;
    price: number;
}

export interface PaymentMethod {
    id: string;
    type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
}

export interface CheckoutFormData {
    email: string;
    name: string;
    company?: string;
    country: string;
    vatId?: string;
}

interface CheckoutModalProps {
    items: CheckoutItem[];
    savedPaymentMethods?: PaymentMethod[];
    onCheckout: (data: { items: CheckoutItem[]; paymentMethodId?: string; formData: CheckoutFormData }) => Promise<void>;
    onClose: () => void;
    className?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    items,
    savedPaymentMethods = [],
    onCheckout,
    onClose,
    className = '',
}) => {
    const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(
        savedPaymentMethods.find(m => m.isDefault)?.id || null
    );
    const [formData, setFormData] = useState<CheckoutFormData>({
        email: '',
        name: '',
        company: '',
        country: 'US',
        vatId: '',
    });
    const [error, setError] = useState<string | null>(null);

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const platformFee = Math.round(subtotal * 0.1); // 10% platform fee
    const total = subtotal + platformFee;

    const handleSubmit = async () => {
        if (step === 'details') {
            if (!formData.email || !formData.name || !formData.country) {
                setError('Please fill in all required fields');
                return;
            }
            setError(null);
            setStep('payment');
            return;
        }

        if (step === 'payment') {
            if (!selectedPaymentMethod && savedPaymentMethods.length > 0) {
                setError('Please select a payment method');
                return;
            }

            setError(null);
            setStep('processing');

            try {
                await onCheckout({
                    items,
                    paymentMethodId: selectedPaymentMethod || undefined,
                    formData,
                });
                setStep('success');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
                setStep('payment');
            }
        }
    };

    const paymentIcons: Record<string, React.ReactNode> = {
        card: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        paypal: <span className="text-lg">🅿️</span>,
        apple_pay: <span className="text-lg">🍎</span>,
        google_pay: <span className="text-lg">G</span>,
    };

    return (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${className}`}>
            <div className="bg-[#0B0F19] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Checkout</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {['details', 'payment', 'success'].map((s, i) => (
                                <React.Fragment key={s}>
                                    <span className={`text-xs uppercase tracking-wider ${step === s || (step === 'processing' && s === 'payment') ? 'text-indigo-400' : 'text-slate-500'}`}>
                                        {s === 'success' ? 'Complete' : s}
                                    </span>
                                    {i < 2 && <span className="text-slate-600">→</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
                        aria-label="Close checkout"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Processing State */}
                    {step === 'processing' && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2">Processing Payment</h3>
                            <p className="text-slate-400">Please wait while we process your order...</p>
                        </div>
                    )}

                    {/* Success State */}
                    {step === 'success' && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Purchase Complete!</h3>
                            <p className="text-slate-400 mb-6">Your licenses have been activated. Check your email for details.</p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-indigo-500 hover:to-purple-500 transition-all"
                            >
                                View Downloads
                            </button>
                        </div>
                    )}

                    {/* Details Step */}
                    {step === 'details' && (
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="checkout-email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="checkout-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="your@email.com"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="checkout-name" className="block text-sm font-medium text-slate-300 mb-2">
                                    Full Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="checkout-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="John Doe"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="checkout-company" className="block text-sm font-medium text-slate-300 mb-2">
                                    Company <span className="text-slate-500">(optional)</span>
                                </label>
                                <input
                                    id="checkout-company"
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                    placeholder="Acme Inc."
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="checkout-country" className="block text-sm font-medium text-slate-300 mb-2">
                                        Country <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        id="checkout-country"
                                        value={formData.country}
                                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="US">United States</option>
                                        <option value="GB">United Kingdom</option>
                                        <option value="DE">Germany</option>
                                        <option value="FR">France</option>
                                        <option value="IT">Italy</option>
                                        <option value="ES">Spain</option>
                                        <option value="CA">Canada</option>
                                        <option value="AU">Australia</option>
                                        <option value="JP">Japan</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="checkout-vat" className="block text-sm font-medium text-slate-300 mb-2">
                                        VAT ID <span className="text-slate-500">(optional)</span>
                                    </label>
                                    <input
                                        id="checkout-vat"
                                        type="text"
                                        value={formData.vatId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, vatId: e.target.value }))}
                                        placeholder="EU123456789"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Step */}
                    {step === 'payment' && (
                        <div className="p-6 space-y-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">Select Payment Method</h3>

                            {savedPaymentMethods.length > 0 ? (
                                <div className="space-y-2">
                                    {savedPaymentMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedPaymentMethod(method.id)}
                                            className={`w-full p-4 rounded-xl border ${selectedPaymentMethod === method.id
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-white/10 bg-slate-800/30 hover:border-white/20'
                                                } flex items-center gap-4 transition-all`}
                                        >
                                            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                                                {paymentIcons[method.type]}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium text-white">
                                                    {method.type === 'card' ? (
                                                        <>
                                                            {method.brand} •••• {method.last4}
                                                        </>
                                                    ) : (
                                                        method.type.replace('_', ' ').toUpperCase()
                                                    )}
                                                </div>
                                                {method.expiryMonth && method.expiryYear && (
                                                    <div className="text-xs text-slate-500">
                                                        Expires {method.expiryMonth}/{method.expiryYear}
                                                    </div>
                                                )}
                                            </div>
                                            {method.isDefault && (
                                                <span className="text-xs text-indigo-400 uppercase tracking-wider">Default</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-xl p-6 text-center">
                                    <p className="text-slate-400 mb-4">No saved payment methods</p>
                                    <p className="text-sm text-slate-500">You'll be redirected to Stripe to complete payment</p>
                                </div>
                            )}

                            <button className="w-full p-4 rounded-xl border border-dashed border-white/20 text-slate-400 hover:border-white/30 hover:text-slate-300 transition-colors">
                                + Add New Payment Method
                            </button>
                        </div>
                    )}
                </div>

                {/* Order Summary & Footer */}
                {(step === 'details' || step === 'payment') && (
                    <div className="border-t border-white/5 p-6">
                        {/* Items Summary */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                                <button className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
                                    View details
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {items.map((item) => (
                                    <div key={item.designId} className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                        <img src={item.designImageUrl} alt={item.designName} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-white">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Platform Fee</span>
                                <span className="text-white">${platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                                <span className="text-white">Total</span>
                                <span className="text-emerald-400">${total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => step === 'payment' ? setStep('details') : onClose()}
                                className="py-3 px-6 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all border border-white/5"
                            >
                                {step === 'payment' ? 'Back' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-indigo-500 hover:to-purple-500 transition-all"
                            >
                                {step === 'details' ? 'Continue to Payment' : `Pay $${total.toFixed(2)}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Order Card Component
interface OrderCardProps {
    order: {
        id: string;
        items: CheckoutItem[];
        total: number;
        status: 'pending' | 'completed' | 'refunded' | 'failed';
        createdAt: Date;
        downloadUrl?: string;
    };
    onViewDetails?: () => void;
    onDownload?: () => void;
    className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onViewDetails,
    onDownload,
    className = '',
}) => {
    const statusColors: Record<string, string> = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        refunded: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <div className={`bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="font-bold text-white">Order #{order.id.slice(-8)}</div>
                        <div className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border uppercase tracking-wider ${statusColors[order.status]}`}>
                        {order.status}
                    </span>
                </div>

                {/* Items */}
                <div className="flex gap-2 mb-4">
                    {order.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                            <img src={item.designImageUrl} alt={item.designName} className="w-full h-full object-cover" />
                        </div>
                    ))}
                    {order.items.length > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 text-sm">
                            +{order.items.length - 4}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="font-bold text-white">${order.total.toFixed(2)}</div>
                    <div className="flex gap-2">
                        {order.status === 'completed' && order.downloadUrl && (
                            <button
                                onClick={onDownload}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
                            >
                                Download
                            </button>
                        )}
                        <button
                            onClick={onViewDetails}
                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors border border-white/5"
                        >
                            Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
