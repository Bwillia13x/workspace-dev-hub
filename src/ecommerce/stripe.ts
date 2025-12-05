/**
 * Stripe Service - Phase 5 E-commerce & Monetization
 *
 * Stripe Connect integration for multi-party payments,
 * payouts, and payment processing.
 */

import type {
    PaymentIntent,
    PaymentSplit,
    Payout,
    BankAccount,
    StripeConnectAccount,
    Currency,
    PaymentStatus,
    PaymentMethod,
    EcommerceEvent,
    EcommerceEventHandler,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface StripeConfig {
    publishableKey: string;
    secretKey?: string;              // Server-side only
    webhookSecret?: string;
    platformAccountId?: string;
    applicationFeePercent: number;   // Default 20%
    environment: 'test' | 'live';
}

const DEFAULT_CONFIG: StripeConfig = {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_xxx',
    applicationFeePercent: 20,
    environment: 'test',
};

if (DEFAULT_CONFIG.publishableKey === 'pk_test_xxx' && typeof window !== 'undefined') {
    console.warn('Stripe Service: Using placeholder publishable key. Payments will not work.');
}

// ============================================================================
// PAYMENT SPLIT CONFIGURATION
// ============================================================================

export const PAYMENT_SPLIT = {
    designer: 0.70,      // 70% to designer
    platform: 0.20,      // 20% platform fee
    manufacturer: 0.10,  // 10% to manufacturer (if applicable)
} as const;

export const STRIPE_PROCESSING_FEE = {
    percentRate: 0.029,  // 2.9%
    fixedFee: 0.30,      // $0.30
} as const;

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const paymentIntents = new Map<string, PaymentIntent>();
const payouts = new Map<string, Payout>();
const bankAccounts = new Map<string, BankAccount>();
const connectAccounts = new Map<string, StripeConnectAccount>();

// ============================================================================
// STRIPE SERVICE CLASS
// ============================================================================

export class StripeService {
    private config: StripeConfig;
    private eventHandlers: Set<EcommerceEventHandler> = new Set();

    constructor(config: Partial<StripeConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    /**
     * Subscribe to payment events
     */
    subscribe(handler: EcommerceEventHandler): () => void {
        this.eventHandlers.add(handler);
        return () => this.eventHandlers.delete(handler);
    }

    private emit(event: EcommerceEvent): void {
        this.eventHandlers.forEach(handler => handler(event));
    }

    // ========================================================================
    // CONNECT ACCOUNT MANAGEMENT
    // ========================================================================

    /**
     * Create a Stripe Connect account for a seller
     */
    async createConnectAccount(
        userId: string,
        options: {
            email: string;
            country: string;
            businessType?: 'individual' | 'company';
        }
    ): Promise<StripeConnectAccount> {
        const account: StripeConnectAccount = {
            id: this.generateId('acct'),
            userId,
            stripeAccountId: `acct_${this.generateRandomString(16)}`,
            businessType: options.businessType || 'individual',
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            requirements: {
                currentlyDue: ['business_profile.url', 'external_account', 'tos_acceptance.date'],
                eventuallyDue: ['individual.verification.document'],
                pastDue: [],
            },
            country: options.country,
            defaultCurrency: this.getCurrencyForCountry(options.country),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        connectAccounts.set(account.id, account);
        return account;
    }

    /**
     * Get Connect account onboarding link
     */
    async createAccountLink(
        accountId: string,
        options: {
            refreshUrl: string;
            returnUrl: string;
            type?: 'account_onboarding' | 'account_update';
        }
    ): Promise<{ url: string; expiresAt: Date }> {
        const account = connectAccounts.get(accountId);
        if (!account) {
            throw new Error(`Connect account ${accountId} not found`);
        }

        // Mock onboarding URL
        const url = `https://connect.stripe.com/setup/s/${account.stripeAccountId}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        return { url, expiresAt };
    }

    /**
     * Get Connect account details
     */
    async getConnectAccount(accountId: string): Promise<StripeConnectAccount | null> {
        return connectAccounts.get(accountId) || null;
    }

    /**
     * Get Connect account by user ID
     */
    async getConnectAccountByUserId(userId: string): Promise<StripeConnectAccount | null> {
        for (const account of connectAccounts.values()) {
            if (account.userId === userId) {
                return account;
            }
        }
        return null;
    }

    /**
     * Update Connect account status (simulates webhook)
     */
    async updateConnectAccountStatus(
        accountId: string,
        updates: Partial<Pick<StripeConnectAccount, 'chargesEnabled' | 'payoutsEnabled' | 'detailsSubmitted'>>
    ): Promise<StripeConnectAccount> {
        const account = connectAccounts.get(accountId);
        if (!account) {
            throw new Error(`Connect account ${accountId} not found`);
        }

        Object.assign(account, updates, { updatedAt: new Date() });
        connectAccounts.set(accountId, account);
        return account;
    }

    // ========================================================================
    // PAYMENT INTENT MANAGEMENT
    // ========================================================================

    /**
     * Create a payment intent for a purchase
     */
    async createPaymentIntent(options: {
        amount: number;
        currency: Currency;
        customerId: string;
        sellerId: string;
        designId?: string;
        licenseId?: string;
        metadata?: Record<string, string>;
        includeManufacturer?: boolean;
    }): Promise<PaymentIntent> {
        // Get seller's Connect account
        const sellerAccount = await this.getConnectAccountByUserId(options.sellerId);
        if (!sellerAccount || !sellerAccount.chargesEnabled) {
            throw new Error('Seller account not set up for payments');
        }

        const paymentIntent: PaymentIntent = {
            id: this.generateId('pi'),
            amount: options.amount,
            currency: options.currency,
            status: 'pending',
            customerId: options.customerId,
            sellerId: options.sellerId,
            designId: options.designId,
            licenseId: options.licenseId,
            metadata: options.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        paymentIntents.set(paymentIntent.id, paymentIntent);
        return paymentIntent;
    }

    /**
     * Confirm a payment intent (simulates payment processing)
     */
    async confirmPaymentIntent(
        paymentIntentId: string,
        paymentMethod: PaymentMethod
    ): Promise<PaymentIntent> {
        const intent = paymentIntents.get(paymentIntentId);
        if (!intent) {
            throw new Error(`Payment intent ${paymentIntentId} not found`);
        }

        // Simulate payment processing
        intent.paymentMethod = paymentMethod;
        intent.status = 'processing';
        intent.updatedAt = new Date();
        paymentIntents.set(paymentIntentId, intent);

        // Simulate async processing
        setTimeout(() => {
            this.completePayment(paymentIntentId);
        }, 100);

        return intent;
    }

    private async completePayment(paymentIntentId: string): Promise<void> {
        const intent = paymentIntents.get(paymentIntentId);
        if (!intent) return;

        intent.status = 'succeeded';
        intent.updatedAt = new Date();
        paymentIntents.set(paymentIntentId, intent);

        // Emit event
        if (intent.licenseId) {
            this.emit({
                type: 'sale_completed',
                data: { licenseId: intent.licenseId, amount: intent.amount },
            });
        }
    }

    /**
     * Get payment intent
     */
    async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
        return paymentIntents.get(paymentIntentId) || null;
    }

    /**
     * List payment intents for a user
     */
    async listPaymentIntents(
        userId: string,
        role: 'customer' | 'seller',
        options?: {
            status?: PaymentStatus;
            limit?: number;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<PaymentIntent[]> {
        let results = Array.from(paymentIntents.values()).filter(p =>
            role === 'customer' ? p.customerId === userId : p.sellerId === userId
        );

        if (options?.status) {
            results = results.filter(p => p.status === options.status);
        }

        if (options?.startDate) {
            results = results.filter(p => p.createdAt >= options.startDate!);
        }

        if (options?.endDate) {
            results = results.filter(p => p.createdAt <= options.endDate!);
        }

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Refund a payment
     */
    async refundPayment(
        paymentIntentId: string,
        options?: {
            amount?: number;
            reason?: string;
        }
    ): Promise<PaymentIntent> {
        const intent = paymentIntents.get(paymentIntentId);
        if (!intent) {
            throw new Error(`Payment intent ${paymentIntentId} not found`);
        }

        if (intent.status !== 'succeeded') {
            throw new Error('Can only refund succeeded payments');
        }

        const refundAmount = options?.amount || intent.amount;
        intent.status = refundAmount === intent.amount ? 'refunded' : 'partially_refunded';
        intent.updatedAt = new Date();
        paymentIntents.set(paymentIntentId, intent);

        return intent;
    }

    // ========================================================================
    // PAYMENT SPLITS
    // ========================================================================

    /**
     * Calculate payment split for a transaction
     */
    calculatePaymentSplit(
        amount: number,
        options?: {
            includeManufacturer?: boolean;
            customPlatformFee?: number;
        }
    ): PaymentSplit {
        const processingFee = amount * STRIPE_PROCESSING_FEE.percentRate + STRIPE_PROCESSING_FEE.fixedFee;
        const netAmount = amount - processingFee;

        const platformRate = options?.customPlatformFee ?? PAYMENT_SPLIT.platform;
        const manufacturerRate = options?.includeManufacturer ? PAYMENT_SPLIT.manufacturer : 0;
        const designerRate = 1 - platformRate - manufacturerRate;

        return {
            designerId: '',  // Set by caller
            designerAmount: Math.round(netAmount * designerRate * 100) / 100,
            platformAmount: Math.round(netAmount * platformRate * 100) / 100,
            manufacturerAmount: Math.round(netAmount * manufacturerRate * 100) / 100,
            processingFee: Math.round(processingFee * 100) / 100,
        };
    }

    // ========================================================================
    // BANK ACCOUNT MANAGEMENT
    // ========================================================================

    /**
     * Add a bank account for payouts
     */
    async addBankAccount(
        userId: string,
        options: {
            accountHolderName: string;
            accountHolderType: 'individual' | 'company';
            bankName: string;
            accountNumber: string;
            routingNumber?: string;
            country: string;
            currency: Currency;
        }
    ): Promise<BankAccount> {
        const bankAccount: BankAccount = {
            id: this.generateId('ba'),
            userId,
            accountHolderName: options.accountHolderName,
            accountHolderType: options.accountHolderType,
            bankName: options.bankName,
            last4: options.accountNumber.slice(-4),
            country: options.country,
            currency: options.currency,
            routingNumber: options.routingNumber,
            isDefault: !this.hasDefaultBankAccount(userId),
            isVerified: false,
            createdAt: new Date(),
        };

        bankAccounts.set(bankAccount.id, bankAccount);
        return bankAccount;
    }

    private hasDefaultBankAccount(userId: string): boolean {
        for (const account of bankAccounts.values()) {
            if (account.userId === userId && account.isDefault) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get bank accounts for a user
     */
    async getBankAccounts(userId: string): Promise<BankAccount[]> {
        return Array.from(bankAccounts.values())
            .filter(a => a.userId === userId);
    }

    /**
     * Set default bank account
     */
    async setDefaultBankAccount(userId: string, bankAccountId: string): Promise<void> {
        for (const account of bankAccounts.values()) {
            if (account.userId === userId) {
                account.isDefault = account.id === bankAccountId;
                bankAccounts.set(account.id, account);
            }
        }
    }

    /**
     * Remove bank account
     */
    async removeBankAccount(bankAccountId: string): Promise<void> {
        const account = bankAccounts.get(bankAccountId);
        if (!account) {
            throw new Error(`Bank account ${bankAccountId} not found`);
        }

        if (account.isDefault) {
            throw new Error('Cannot remove default bank account');
        }

        bankAccounts.delete(bankAccountId);
    }

    // ========================================================================
    // PAYOUT MANAGEMENT
    // ========================================================================

    /**
     * Create a payout request
     */
    async createPayout(
        userId: string,
        options: {
            amount: number;
            currency: Currency;
            bankAccountId?: string;
            transactionIds?: string[];
        }
    ): Promise<Payout> {
        // Verify minimum payout amount
        const MIN_PAYOUT = 50;
        if (options.amount < MIN_PAYOUT) {
            throw new Error(`Minimum payout amount is $${MIN_PAYOUT}`);
        }

        // Get bank account
        let bankAccountId = options.bankAccountId;
        if (!bankAccountId) {
            const accounts = await this.getBankAccounts(userId);
            const defaultAccount = accounts.find(a => a.isDefault);
            if (!defaultAccount) {
                throw new Error('No bank account configured for payouts');
            }
            bankAccountId = defaultAccount.id;
        }

        const payout: Payout = {
            id: this.generateId('po'),
            userId,
            amount: options.amount,
            currency: options.currency,
            status: 'pending',
            method: 'bank_transfer',
            bankAccountId,
            scheduledDate: this.getNextPayoutDate(),
            transactionIds: options.transactionIds || [],
            createdAt: new Date(),
        };

        payouts.set(payout.id, payout);
        return payout;
    }

    /**
     * Get next scheduled payout date (1st or 15th of month)
     */
    private getNextPayoutDate(): Date {
        const now = new Date();
        const day = now.getDate();

        if (day < 15) {
            return new Date(now.getFullYear(), now.getMonth(), 15);
        } else {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return nextMonth;
        }
    }

    /**
     * Get payout by ID
     */
    async getPayout(payoutId: string): Promise<Payout | null> {
        return payouts.get(payoutId) || null;
    }

    /**
     * List payouts for a user
     */
    async listPayouts(
        userId: string,
        options?: {
            status?: Payout['status'];
            limit?: number;
        }
    ): Promise<Payout[]> {
        let results = Array.from(payouts.values())
            .filter(p => p.userId === userId);

        if (options?.status) {
            results = results.filter(p => p.status === options.status);
        }

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Process pending payouts (called by scheduler)
     */
    async processPayouts(): Promise<{ processed: number; failed: number }> {
        const now = new Date();
        const pendingPayouts = Array.from(payouts.values())
            .filter(p => p.status === 'pending' && p.scheduledDate <= now);

        let processed = 0;
        let failed = 0;

        for (const payout of pendingPayouts) {
            try {
                payout.status = 'processing';
                payouts.set(payout.id, payout);

                // Simulate processing
                await this.delay(100);

                payout.status = 'paid';
                payout.processedDate = new Date();
                payouts.set(payout.id, payout);

                this.emit({
                    type: 'payout_processed',
                    data: { payoutId: payout.id, amount: payout.amount },
                });

                processed++;
            } catch {
                payout.status = 'failed';
                payouts.set(payout.id, payout);
                failed++;
            }
        }

        return { processed, failed };
    }

    // ========================================================================
    // BALANCE & EARNINGS
    // ========================================================================

    /**
     * Get available balance for a user
     */
    async getBalance(userId: string): Promise<{
        available: number;
        pending: number;
        currency: Currency;
    }> {
        const payments = Array.from(paymentIntents.values())
            .filter(p => p.sellerId === userId && p.status === 'succeeded');

        const payoutTotal = Array.from(payouts.values())
            .filter(p => p.userId === userId && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

        const pendingPayouts = Array.from(payouts.values())
            .filter(p => p.userId === userId && ['pending', 'processing'].includes(p.status))
            .reduce((sum, p) => sum + p.amount, 0);

        const totalEarned = payments.reduce((sum, p) => {
            const split = this.calculatePaymentSplit(p.amount);
            return sum + split.designerAmount;
        }, 0);

        return {
            available: Math.max(0, totalEarned - payoutTotal - pendingPayouts),
            pending: pendingPayouts,
            currency: 'USD',
        };
    }

    /**
     * Get earnings summary for a period
     */
    async getEarningsSummary(
        userId: string,
        options?: {
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<{
        grossRevenue: number;
        platformFees: number;
        processingFees: number;
        netEarnings: number;
        transactionCount: number;
    }> {
        let payments = Array.from(paymentIntents.values())
            .filter(p => p.sellerId === userId && p.status === 'succeeded');

        if (options?.startDate) {
            payments = payments.filter(p => p.createdAt >= options.startDate!);
        }

        if (options?.endDate) {
            payments = payments.filter(p => p.createdAt <= options.endDate!);
        }

        const grossRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        let platformFees = 0;
        let processingFees = 0;
        let netEarnings = 0;

        for (const payment of payments) {
            const split = this.calculatePaymentSplit(payment.amount);
            platformFees += split.platformAmount;
            processingFees += split.processingFee;
            netEarnings += split.designerAmount;
        }

        return {
            grossRevenue,
            platformFees,
            processingFees,
            netEarnings,
            transactionCount: payments.length,
        };
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    private generateId(prefix: string): string {
        return `${prefix}_${this.generateRandomString(24)}`;
    }

    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private getCurrencyForCountry(country: string): Currency {
        const currencyMap: Record<string, Currency> = {
            US: 'USD',
            GB: 'GBP',
            EU: 'EUR',
            DE: 'EUR',
            FR: 'EUR',
            JP: 'JPY',
            CA: 'CAD',
            AU: 'AUD',
        };
        return currencyMap[country] || 'USD';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================================================
    // WEBHOOK HANDLING (for production)
    // ========================================================================

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(
        payload: string,
        signature: string
    ): Promise<{ received: boolean }> {
        // In production, verify signature with webhook secret
        // const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

        // Mock implementation
        try {
            const event = JSON.parse(payload);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    // Handle successful payment
                    break;
                case 'payment_intent.payment_failed':
                    // Handle failed payment
                    break;
                case 'account.updated':
                    // Handle Connect account updates
                    break;
                case 'payout.paid':
                    // Handle payout completion
                    break;
                case 'charge.dispute.created':
                    // Handle dispute creation
                    break;
            }

            return { received: true };
        } catch {
            throw new Error('Invalid webhook payload');
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let stripeServiceInstance: StripeService | null = null;

export function getStripeService(config?: Partial<StripeConfig>): StripeService {
    if (!stripeServiceInstance) {
        stripeServiceInstance = new StripeService(config);
    }
    return stripeServiceInstance;
}

export function resetStripeService(): void {
    stripeServiceInstance = null;
    paymentIntents.clear();
    payouts.clear();
    bankAccounts.clear();
    connectAccounts.clear();
}

// ============================================================================
// REACT HOOKS
// ============================================================================

export interface UseStripeReturn {
    createPaymentIntent: (options: Parameters<StripeService['createPaymentIntent']>[0]) => Promise<PaymentIntent>;
    confirmPayment: (paymentIntentId: string, paymentMethod: PaymentMethod) => Promise<PaymentIntent>;
    getBalance: (userId: string) => Promise<{ available: number; pending: number; currency: Currency }>;
    listPayments: (userId: string, role: 'customer' | 'seller') => Promise<PaymentIntent[]>;
    requestPayout: (userId: string, amount: number, currency: Currency) => Promise<Payout>;
    listPayouts: (userId: string) => Promise<Payout[]>;
}

export function createStripeHooks(service: StripeService): UseStripeReturn {
    return {
        createPaymentIntent: (options) => service.createPaymentIntent(options),
        confirmPayment: (id, method) => service.confirmPaymentIntent(id, method),
        getBalance: (userId) => service.getBalance(userId),
        listPayments: (userId, role) => service.listPaymentIntents(userId, role),
        requestPayout: (userId, amount, currency) => service.createPayout(userId, { amount, currency }),
        listPayouts: (userId) => service.listPayouts(userId),
    };
}
