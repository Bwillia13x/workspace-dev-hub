/**
 * Stripe Webhook Handler
 *
 * Handles incoming Stripe webhook events for payment processing.
 * Supports payment intents, subscriptions, payouts, and disputes.
 */

import type {
    PaymentStatus,
    Transaction,
    Payout,
} from '../ecommerce/types';

// ============================================================================
// Webhook Event Types
// ============================================================================

export type StripeEventType =
    | 'payment_intent.succeeded'
    | 'payment_intent.payment_failed'
    | 'payment_intent.canceled'
    | 'payment_intent.processing'
    | 'charge.refunded'
    | 'charge.dispute.created'
    | 'charge.dispute.updated'
    | 'charge.dispute.closed'
    | 'payout.created'
    | 'payout.paid'
    | 'payout.failed'
    | 'payout.canceled'
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted'
    | 'invoice.paid'
    | 'invoice.payment_failed'
    | 'account.updated'
    | 'transfer.created'
    | 'transfer.reversed';

export interface StripeWebhookEvent<T = unknown> {
    id: string;
    type: StripeEventType;
    created: number;
    data: {
        object: T;
        previous_attributes?: Partial<T>;
    };
    livemode: boolean;
    pending_webhooks: number;
    request?: {
        id: string;
        idempotency_key: string;
    };
}

// Stripe object types
export interface StripePaymentIntent {
    id: string;
    amount: number;
    amount_received: number;
    currency: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
    customer?: string;
    metadata: Record<string, string>;
    payment_method?: string;
    receipt_email?: string;
    created: number;
    charges?: {
        data: StripeCharge[];
    };
}

export interface StripeCharge {
    id: string;
    amount: number;
    amount_refunded: number;
    refunded: boolean;
    dispute?: {
        id: string;
        status: string;
    };
}

export interface StripePayout {
    id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'in_transit' | 'canceled' | 'failed';
    arrival_date: number;
    created: number;
    metadata: Record<string, string>;
}

export interface StripeSubscription {
    id: string;
    customer: string;
    status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
    current_period_start: number;
    current_period_end: number;
    items: {
        data: Array<{
            id: string;
            price: {
                id: string;
                product: string;
                unit_amount: number;
                currency: string;
            };
        }>;
    };
    metadata: Record<string, string>;
}

export interface StripeDispute {
    id: string;
    charge: string;
    amount: number;
    currency: string;
    status: 'warning_needs_response' | 'warning_under_review' | 'warning_closed' | 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost';
    reason: string;
    created: number;
    metadata: Record<string, string>;
}

export interface StripeAccount {
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    requirements?: {
        currently_due: string[];
        eventually_due: string[];
        past_due: string[];
    };
}

// ============================================================================
// Webhook Handler Types
// ============================================================================

export interface WebhookHandlerResult {
    success: boolean;
    message: string;
    data?: unknown;
}

export type WebhookHandler<T = unknown> = (
    event: StripeWebhookEvent<T>,
    context: WebhookContext
) => Promise<WebhookHandlerResult>;

export interface WebhookContext {
    storage: {
        saveTransaction: (transaction: Partial<Transaction>) => Promise<string>;
        updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
        getTransactionByStripeId: (stripeId: string) => Promise<Transaction | null>;
        savePayout: (payout: Partial<Payout>) => Promise<string>;
        updatePayout: (id: string, updates: Partial<Payout>) => Promise<void>;
        getPayoutByStripeId: (stripeId: string) => Promise<Payout | null>;
        updateSubscription: (customerId: string, subscriptionData: unknown) => Promise<void>;
        updateConnectAccount: (accountId: string, accountData: unknown) => Promise<void>;
        createDispute: (disputeData: unknown) => Promise<string>;
        updateDispute: (disputeId: string, updates: unknown) => Promise<void>;
    };
    notifications: {
        sendEmail: (to: string, template: string, data: Record<string, unknown>) => Promise<void>;
        sendPush: (userId: string, title: string, body: string) => Promise<void>;
    };
    logger: {
        info: (message: string, data?: unknown) => void;
        error: (message: string, error?: Error) => void;
        warn: (message: string, data?: unknown) => void;
    };
}

// ============================================================================
// Event Handlers
// ============================================================================

const mapStripeStatusToPaymentStatus = (stripeStatus: string): PaymentStatus => {
    const mapping: Record<string, PaymentStatus> = {
        succeeded: 'succeeded',
        processing: 'processing',
        requires_payment_method: 'pending',
        requires_confirmation: 'pending',
        requires_action: 'pending',
        requires_capture: 'pending',
        canceled: 'canceled',
    };
    return mapping[stripeStatus] || 'pending';
};

export const handlePaymentIntentSucceeded: WebhookHandler<StripePaymentIntent> = async (event, context) => {
    const paymentIntent = event.data.object;

    context.logger.info('Payment intent succeeded', { id: paymentIntent.id });

    // Check if we already processed this payment
    const existing = await context.storage.getTransactionByStripeId(paymentIntent.id);

    if (existing) {
        await context.storage.updateTransaction(existing.id, {
            status: 'succeeded',
        });
        return { success: true, message: 'Transaction updated' };
    }

    // Create new transaction record
    const transactionId = await context.storage.saveTransaction({
        type: 'payment',
        amount: paymentIntent.amount / 100, // Stripe uses cents
        currency: paymentIntent.currency.toUpperCase() as any,
        status: 'succeeded',
        toUserId: paymentIntent.metadata.seller_id,
        fromUserId: paymentIntent.metadata.buyer_id,
        designId: paymentIntent.metadata.design_id,
        orderId: paymentIntent.metadata.order_id,
        description: `Payment for design ${paymentIntent.metadata.design_id}`,
        metadata: {
            stripe_payment_intent_id: paymentIntent.id,
            ...paymentIntent.metadata,
        },
    });

    // Send notification to seller
    if (paymentIntent.metadata.seller_id) {
        await context.notifications.sendEmail(
            paymentIntent.metadata.seller_email || '',
            'payment_received',
            {
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                designId: paymentIntent.metadata.design_id,
                transactionId,
            }
        );
    }

    return {
        success: true,
        message: 'Payment processed successfully',
        data: { transactionId },
    };
};

export const handlePaymentIntentFailed: WebhookHandler<StripePaymentIntent> = async (event, context) => {
    const paymentIntent = event.data.object;

    context.logger.warn('Payment intent failed', { id: paymentIntent.id });

    const existing = await context.storage.getTransactionByStripeId(paymentIntent.id);

    if (existing) {
        await context.storage.updateTransaction(existing.id, {
            status: 'failed',
        });
    }

    // Notify buyer of failed payment
    if (paymentIntent.metadata.buyer_email) {
        await context.notifications.sendEmail(
            paymentIntent.metadata.buyer_email,
            'payment_failed',
            {
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                designId: paymentIntent.metadata.design_id,
            }
        );
    }

    return {
        success: true,
        message: 'Payment failure recorded',
    };
};

export const handleChargeRefunded: WebhookHandler<StripeCharge> = async (event, context) => {
    const charge = event.data.object;

    context.logger.info('Charge refunded', {
        id: charge.id,
        amount: charge.amount_refunded,
    });

    // Find the original transaction
    const existing = await context.storage.getTransactionByStripeId(charge.id);

    if (existing) {
        const isFullRefund = charge.amount_refunded >= charge.amount;
        await context.storage.updateTransaction(existing.id, {
            status: isFullRefund ? 'refunded' : 'partially_refunded',
        });

        // Create refund transaction
        await context.storage.saveTransaction({
            type: 'refund',
            amount: charge.amount_refunded / 100,
            currency: existing.currency,
            status: 'succeeded',
            fromUserId: existing.toUserId,
            toUserId: existing.fromUserId,
            orderId: existing.orderId,
            description: `Refund for transaction ${existing.id}`,
            metadata: {
                original_transaction_id: existing.id,
                stripe_charge_id: charge.id,
            },
        });
    }

    return {
        success: true,
        message: 'Refund processed',
    };
};

export const handlePayoutPaid: WebhookHandler<StripePayout> = async (event, context) => {
    const payout = event.data.object;

    context.logger.info('Payout paid', { id: payout.id });

    const existing = await context.storage.getPayoutByStripeId(payout.id);

    if (existing) {
        await context.storage.updatePayout(existing.id, {
            status: 'paid',
        });
    }

    return {
        success: true,
        message: 'Payout status updated',
    };
};

export const handlePayoutFailed: WebhookHandler<StripePayout> = async (event, context) => {
    const payout = event.data.object;

    context.logger.error('Payout failed', { id: payout.id } as any);

    const existing = await context.storage.getPayoutByStripeId(payout.id);

    if (existing) {
        await context.storage.updatePayout(existing.id, {
            status: 'failed',
        });
    }

    return {
        success: true,
        message: 'Payout failure recorded',
    };
};

export const handleDisputeCreated: WebhookHandler<StripeDispute> = async (event, context) => {
    const dispute = event.data.object;

    context.logger.warn('Dispute created', {
        id: dispute.id,
        reason: dispute.reason,
    });

    await context.storage.createDispute({
        stripeDisputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        currency: dispute.currency.toUpperCase(),
        reason: dispute.reason,
        status: 'open',
        createdAt: new Date(dispute.created * 1000),
    });

    return {
        success: true,
        message: 'Dispute created',
    };
};

export const handleDisputeClosed: WebhookHandler<StripeDispute> = async (event, context) => {
    const dispute = event.data.object;

    context.logger.info('Dispute closed', {
        id: dispute.id,
        status: dispute.status,
    });

    await context.storage.updateDispute(dispute.id, {
        status: dispute.status === 'won' ? 'resolved' : 'closed',
        outcome: dispute.status,
    });

    return {
        success: true,
        message: 'Dispute closed',
    };
};

export const handleSubscriptionUpdated: WebhookHandler<StripeSubscription> = async (event, context) => {
    const subscription = event.data.object;

    context.logger.info('Subscription updated', {
        id: subscription.id,
        status: subscription.status,
    });

    await context.storage.updateSubscription(subscription.customer, {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        items: subscription.items.data,
    });

    return {
        success: true,
        message: 'Subscription updated',
    };
};

export const handleAccountUpdated: WebhookHandler<StripeAccount> = async (event, context) => {
    const account = event.data.object;

    context.logger.info('Connect account updated', {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
    });

    await context.storage.updateConnectAccount(account.id, {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
    });

    return {
        success: true,
        message: 'Account updated',
    };
};

// ============================================================================
// Webhook Router
// ============================================================================

const handlers: Partial<Record<StripeEventType, WebhookHandler<any>>> = {
    'payment_intent.succeeded': handlePaymentIntentSucceeded,
    'payment_intent.payment_failed': handlePaymentIntentFailed,
    'charge.refunded': handleChargeRefunded,
    'charge.dispute.created': handleDisputeCreated,
    'charge.dispute.closed': handleDisputeClosed,
    'payout.paid': handlePayoutPaid,
    'payout.failed': handlePayoutFailed,
    'customer.subscription.created': handleSubscriptionUpdated,
    'customer.subscription.updated': handleSubscriptionUpdated,
    'customer.subscription.deleted': handleSubscriptionUpdated,
    'account.updated': handleAccountUpdated,
};

export interface WebhookVerificationOptions {
    signature: string;
    webhookSecret: string;
    payload: string;
}

/**
 * Verify Stripe webhook signature
 * In production, use Stripe's official library for this
 */
export function verifyWebhookSignature(options: WebhookVerificationOptions): boolean {
    // This is a simplified verification
    // In production, use: stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    const { signature, webhookSecret, payload } = options;

    if (!signature || !webhookSecret || !payload) {
        return false;
    }

    // Parse the signature header
    const signatureParts = signature.split(',');
    const timestampPart = signatureParts.find(p => p.startsWith('t='));
    const v1Part = signatureParts.find(p => p.startsWith('v1='));

    if (!timestampPart || !v1Part) {
        return false;
    }

    const timestamp = parseInt(timestampPart.replace('t=', ''), 10);
    const maxAge = 300; // 5 minutes

    // Check timestamp is within acceptable range
    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > maxAge) {
        return false;
    }

    // In production, compute HMAC and compare
    // const expectedSignature = crypto.createHmac('sha256', webhookSecret)
    //     .update(`${timestamp}.${payload}`)
    //     .digest('hex');
    // return crypto.timingSafeEqual(Buffer.from(v1Part.replace('v1=', '')), Buffer.from(expectedSignature));

    return true; // Simplified for development
}

/**
 * Process incoming webhook event
 */
export async function processWebhook(
    event: StripeWebhookEvent,
    context: WebhookContext
): Promise<WebhookHandlerResult> {
    const handler = handlers[event.type];

    if (!handler) {
        context.logger.warn('Unhandled webhook event type', { type: event.type });
        return {
            success: true,
            message: `No handler for event type: ${event.type}`,
        };
    }

    try {
        return await handler(event, context);
    } catch (error) {
        context.logger.error('Webhook handler error', error as Error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create webhook endpoint handler for serverless/edge functions
 */
export function createWebhookEndpoint(
    webhookSecret: string,
    context: WebhookContext
) {
    return async (request: {
        body: string;
        headers: { 'stripe-signature'?: string };
    }): Promise<{
        status: number;
        body: string;
    }> => {
        const signature = request.headers['stripe-signature'];

        if (!signature) {
            return {
                status: 400,
                body: JSON.stringify({ error: 'Missing signature' }),
            };
        }

        // Verify signature
        const isValid = verifyWebhookSignature({
            signature,
            webhookSecret,
            payload: request.body,
        });

        if (!isValid) {
            return {
                status: 401,
                body: JSON.stringify({ error: 'Invalid signature' }),
            };
        }

        // Parse event
        let event: StripeWebhookEvent;
        try {
            event = JSON.parse(request.body);
        } catch {
            return {
                status: 400,
                body: JSON.stringify({ error: 'Invalid JSON' }),
            };
        }

        // Process webhook
        const result = await processWebhook(event, context);

        return {
            status: result.success ? 200 : 500,
            body: JSON.stringify(result),
        };
    };
}

export default {
    processWebhook,
    createWebhookEndpoint,
    verifyWebhookSignature,
    handlers,
};
