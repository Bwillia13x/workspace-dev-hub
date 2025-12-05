/**
 * Stripe Service Tests
 *
 * Tests for Stripe Connect payment processing functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    StripeService,
    getStripeService,
    resetStripeService,
    PAYMENT_SPLIT,
    STRIPE_PROCESSING_FEE,
    createStripeHooks,
} from '../../ecommerce/stripe';

describe('Stripe Service', () => {
    let stripeService: StripeService;

    beforeEach(() => {
        resetStripeService();
        stripeService = getStripeService();
    });

    describe('Constants', () => {
        it('should define correct payment split percentages', () => {
            expect(PAYMENT_SPLIT.designer).toBe(0.70);
            expect(PAYMENT_SPLIT.platform).toBe(0.20);
            expect(PAYMENT_SPLIT.manufacturer).toBe(0.10);
            // Use toBeCloseTo for floating point arithmetic
            expect(PAYMENT_SPLIT.designer + PAYMENT_SPLIT.platform + PAYMENT_SPLIT.manufacturer).toBeCloseTo(1, 10);
        });

        it('should define correct Stripe processing fee', () => {
            expect(STRIPE_PROCESSING_FEE.percentRate).toBe(0.029);
            expect(STRIPE_PROCESSING_FEE.fixedFee).toBe(0.30);
        });
    });

    describe('Connect Account Management', () => {
        it('should create a new Connect account', async () => {
            const account = await stripeService.createConnectAccount('user_123', {
                email: 'test@example.com',
                country: 'US',
                businessType: 'individual',
            });

            expect(account).toBeDefined();
            expect(account.userId).toBe('user_123');
            expect(account.stripeAccountId).toMatch(/^acct_/);
            expect(account.businessType).toBe('individual');
        });

        it('should get an existing Connect account by ID', async () => {
            const created = await stripeService.createConnectAccount('user_456', {
                email: 'test2@example.com',
                country: 'US',
                businessType: 'individual',
            });

            const account = await stripeService.getConnectAccount(created.id);
            expect(account).toBeDefined();
            expect(account?.userId).toBe('user_456');
        });

        it('should get Connect account by user ID', async () => {
            await stripeService.createConnectAccount('user_456', {
                email: 'test2@example.com',
                country: 'US',
                businessType: 'individual',
            });

            const account = await stripeService.getConnectAccountByUserId('user_456');
            expect(account).toBeDefined();
            expect(account?.userId).toBe('user_456');
        });

        it('should return null for non-existent account', async () => {
            const account = await stripeService.getConnectAccount('non_existent');
            expect(account).toBeNull();
        });

        it('should generate onboarding link', async () => {
            const created = await stripeService.createConnectAccount('user_789', {
                email: 'test3@example.com',
                country: 'US',
                businessType: 'individual',
            });

            const link = await stripeService.createAccountLink(created.id, {
                returnUrl: 'https://example.com/return',
                refreshUrl: 'https://example.com/refresh',
            });

            expect(link).toBeDefined();
            expect(link.url).toContain('connect.stripe.com');
            expect(link.expiresAt).toBeInstanceOf(Date);
        });

        it('should update Connect account status', async () => {
            const created = await stripeService.createConnectAccount('user_status', {
                email: 'status@example.com',
                country: 'US',
            });

            const updated = await stripeService.updateConnectAccountStatus(created.id, {
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true,
            });

            expect(updated.chargesEnabled).toBe(true);
            expect(updated.payoutsEnabled).toBe(true);
            expect(updated.detailsSubmitted).toBe(true);
        });
    });

    describe('Payment Intent Management', () => {
        let sellerAccountId: string;

        beforeEach(async () => {
            // Set up accounts for payment tests
            const account = await stripeService.createConnectAccount('seller_1', {
                email: 'seller@example.com',
                country: 'US',
                businessType: 'individual',
            });
            sellerAccountId = account.id;

            // Enable charges for seller
            await stripeService.updateConnectAccountStatus(sellerAccountId, {
                chargesEnabled: true,
            });
        });

        it('should create a payment intent', async () => {
            const intent = await stripeService.createPaymentIntent({
                amount: 10000, // $100.00
                currency: 'USD',
                customerId: 'customer_1',
                sellerId: 'seller_1',
                designId: 'design_1',
                metadata: { source: 'marketplace' },
            });

            expect(intent).toBeDefined();
            expect(intent.id).toMatch(/^pi_/);
            expect(intent.amount).toBe(10000);
            expect(intent.status).toBe('pending');
        });

        it('should calculate payment splits correctly', () => {
            const split = stripeService.calculatePaymentSplit(10000);

            expect(split).toBeDefined();
            expect(split.designerAmount).toBeGreaterThan(0);
            expect(split.platformAmount).toBeGreaterThan(0);
            expect(split.processingFee).toBeGreaterThan(0);
        });

        it('should calculate payment splits with manufacturer', () => {
            const split = stripeService.calculatePaymentSplit(10000, { includeManufacturer: true });

            expect(split.manufacturerAmount).toBeGreaterThan(0);
        });

        it('should confirm a payment intent', async () => {
            const intent = await stripeService.createPaymentIntent({
                amount: 5000,
                currency: 'USD',
                customerId: 'customer_2',
                sellerId: 'seller_1',
                designId: 'design_2',
            });

            const confirmed = await stripeService.confirmPaymentIntent(intent.id, 'card');
            expect(confirmed.status).toBe('processing');
            expect(confirmed.paymentMethod).toBe('card');
        });

        it('should get payment intent by ID', async () => {
            const intent = await stripeService.createPaymentIntent({
                amount: 3000,
                currency: 'USD',
                customerId: 'customer_get',
                sellerId: 'seller_1',
            });

            const fetched = await stripeService.getPaymentIntent(intent.id);
            expect(fetched).toBeDefined();
            expect(fetched?.id).toBe(intent.id);
        });

        it('should list payment intents by user', async () => {
            await stripeService.createPaymentIntent({
                amount: 5000,
                currency: 'USD',
                customerId: 'customer_3',
                sellerId: 'seller_1',
                designId: 'design_3',
            });

            await stripeService.createPaymentIntent({
                amount: 7500,
                currency: 'USD',
                customerId: 'customer_3',
                sellerId: 'seller_1',
                designId: 'design_4',
            });

            const customerPayments = await stripeService.listPaymentIntents('customer_3', 'customer');
            expect(customerPayments.length).toBeGreaterThanOrEqual(2);

            const sellerPayments = await stripeService.listPaymentIntents('seller_1', 'seller');
            expect(sellerPayments.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Bank Account Management', () => {
        it('should add a bank account', async () => {
            const bankAccount = await stripeService.addBankAccount('bank_user', {
                accountHolderName: 'Test User',
                accountHolderType: 'individual',
                bankName: 'Test Bank',
                accountNumber: '000123456789',
                routingNumber: '110000000',
                country: 'US',
                currency: 'USD',
            });

            expect(bankAccount).toBeDefined();
            expect(bankAccount.id).toMatch(/^ba_/);
            expect(bankAccount.last4).toBe('6789');
            expect(bankAccount.isDefault).toBe(true);
        });

        it('should list bank accounts for user', async () => {
            await stripeService.addBankAccount('bank_user_2', {
                accountHolderName: 'Test User',
                accountHolderType: 'individual',
                bankName: 'Test Bank',
                accountNumber: '000123456789',
                country: 'US',
                currency: 'USD',
            });

            const accounts = await stripeService.getBankAccounts('bank_user_2');
            expect(accounts.length).toBeGreaterThanOrEqual(1);
        });

        it('should set default bank account', async () => {
            const account1 = await stripeService.addBankAccount('bank_user_3', {
                accountHolderName: 'Test User',
                accountHolderType: 'individual',
                bankName: 'Bank 1',
                accountNumber: '000111111111',
                country: 'US',
                currency: 'USD',
            });

            const account2 = await stripeService.addBankAccount('bank_user_3', {
                accountHolderName: 'Test User',
                accountHolderType: 'individual',
                bankName: 'Bank 2',
                accountNumber: '000222222222',
                country: 'US',
                currency: 'USD',
            });

            await stripeService.setDefaultBankAccount('bank_user_3', account2.id);

            const accounts = await stripeService.getBankAccounts('bank_user_3');
            const defaultAccount = accounts.find(a => a.isDefault);
            expect(defaultAccount?.id).toBe(account2.id);
        });
    });

    describe('Balance & Payouts', () => {
        let sellerAccountId: string;

        beforeEach(async () => {
            const account = await stripeService.createConnectAccount('payout_user', {
                email: 'payout@example.com',
                country: 'US',
                businessType: 'individual',
            });
            sellerAccountId = account.id;

            await stripeService.updateConnectAccountStatus(sellerAccountId, {
                chargesEnabled: true,
            });

            // Add bank account for payouts
            await stripeService.addBankAccount('payout_user', {
                accountHolderName: 'Payout User',
                accountHolderType: 'individual',
                bankName: 'Test Bank',
                accountNumber: '000123456789',
                country: 'US',
                currency: 'USD',
            });

            // Create and confirm a payment to generate balance
            const intent = await stripeService.createPaymentIntent({
                amount: 10000,
                currency: 'USD',
                customerId: 'payer_1',
                sellerId: 'payout_user',
            });
            await stripeService.confirmPaymentIntent(intent.id, 'card');
        });

        it('should get user balance', async () => {
            const balance = await stripeService.getBalance('payout_user');
            expect(balance).toBeDefined();
            expect(typeof balance.available).toBe('number');
            expect(typeof balance.pending).toBe('number');
            expect(balance.currency).toBe('USD');
        });

        it('should create a payout request', async () => {
            const payout = await stripeService.createPayout('payout_user', {
                amount: 5000,
                currency: 'USD',
            });

            expect(payout).toBeDefined();
            expect(payout.id).toMatch(/^po_/);
            expect(payout.amount).toBe(5000);
            expect(payout.status).toBe('pending');
        });

        it('should reject payout below minimum', async () => {
            await expect(stripeService.createPayout('payout_user', {
                amount: 10, // Below $50 minimum
                currency: 'USD',
            })).rejects.toThrow('Minimum payout amount');
        });

        it('should list payouts for user', async () => {
            await stripeService.createPayout('payout_user', {
                amount: 5000,
                currency: 'USD',
            });

            const payouts = await stripeService.listPayouts('payout_user');
            expect(payouts.length).toBeGreaterThanOrEqual(1);
        });

        it('should get payout by ID', async () => {
            const payout = await stripeService.createPayout('payout_user', {
                amount: 5000,
                currency: 'USD',
            });

            const fetched = await stripeService.getPayout(payout.id);
            expect(fetched).toBeDefined();
            expect(fetched?.id).toBe(payout.id);
        });

        it('should get earnings summary', async () => {
            const summary = await stripeService.getEarningsSummary('payout_user');

            expect(summary).toBeDefined();
            expect(typeof summary.grossRevenue).toBe('number');
            expect(typeof summary.platformFees).toBe('number');
            expect(typeof summary.processingFees).toBe('number');
            expect(typeof summary.netEarnings).toBe('number');
            expect(typeof summary.transactionCount).toBe('number');
        });
    });

    describe('Refunds', () => {
        let paymentIntentId: string;
        let sellerAccountId: string;

        beforeEach(async () => {
            const account = await stripeService.createConnectAccount('refund_seller', {
                email: 'refund@example.com',
                country: 'US',
                businessType: 'individual',
            });
            sellerAccountId = account.id;

            await stripeService.updateConnectAccountStatus(sellerAccountId, {
                chargesEnabled: true,
            });

            const intent = await stripeService.createPaymentIntent({
                amount: 10000,
                currency: 'USD',
                customerId: 'refund_customer',
                sellerId: 'refund_seller',
            });

            // Wait for processing to complete
            await stripeService.confirmPaymentIntent(intent.id, 'card');
            paymentIntentId = intent.id;

            // Manually set to succeeded for refund test
            // (since async processing may not complete in time)
            const pi = await stripeService.getPaymentIntent(paymentIntentId);
            if (pi) {
                // Force status for test
                (pi as { status: string }).status = 'succeeded';
            }
        });

        it('should process a full refund', async () => {
            const refund = await stripeService.refundPayment(paymentIntentId, {
                reason: 'requested_by_customer',
            });

            expect(refund).toBeDefined();
            expect(refund.status).toBe('refunded');
        });

        it('should process a partial refund', async () => {
            const refund = await stripeService.refundPayment(paymentIntentId, {
                amount: 5000,
                reason: 'requested_by_customer',
            });

            expect(refund).toBeDefined();
            expect(refund.status).toBe('partially_refunded');
        });
    });

    describe('Webhook Handling', () => {
        it('should handle payment_intent.succeeded event', async () => {
            const payload = JSON.stringify({
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_webhook_test',
                        amount: 10000,
                        currency: 'usd',
                    },
                },
            });

            const result = await stripeService.handleWebhook(payload, 'test_signature');
            expect(result.received).toBe(true);
        });

        it('should handle payout.paid event', async () => {
            const payload = JSON.stringify({
                type: 'payout.paid',
                data: {
                    object: {
                        id: 'po_webhook_test',
                        amount: 5000,
                    },
                },
            });

            const result = await stripeService.handleWebhook(payload, 'test_signature');
            expect(result.received).toBe(true);
        });

        it('should handle account.updated event', async () => {
            const payload = JSON.stringify({
                type: 'account.updated',
                data: {
                    object: {
                        id: 'acct_test',
                        charges_enabled: true,
                    },
                },
            });

            const result = await stripeService.handleWebhook(payload, 'test_signature');
            expect(result.received).toBe(true);
        });

        it('should throw error for invalid payload', async () => {
            await expect(
                stripeService.handleWebhook('invalid json', 'signature')
            ).rejects.toThrow('Invalid webhook payload');
        });
    });

    describe('Event Subscription', () => {
        it('should subscribe to events', async () => {
            const events: unknown[] = [];
            const unsubscribe = stripeService.subscribe((event) => {
                events.push(event);
            });

            expect(typeof unsubscribe).toBe('function');
            unsubscribe();
        });
    });

    describe('Stripe Hooks Factory', () => {
        it('should create stripe hooks', () => {
            const hooks = createStripeHooks(stripeService);

            expect(hooks).toBeDefined();
            expect(typeof hooks.createPaymentIntent).toBe('function');
            expect(typeof hooks.confirmPayment).toBe('function');
            expect(typeof hooks.getBalance).toBe('function');
            expect(typeof hooks.listPayments).toBe('function');
            expect(typeof hooks.requestPayout).toBe('function');
            expect(typeof hooks.listPayouts).toBe('function');
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance from getStripeService', () => {
            const instance1 = getStripeService();
            const instance2 = getStripeService();
            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getStripeService();
            resetStripeService();
            const instance2 = getStripeService();
            expect(instance1).not.toBe(instance2);
        });
    });
});
