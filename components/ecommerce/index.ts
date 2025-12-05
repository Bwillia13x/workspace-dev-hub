/**
 * E-commerce Components
 * Barrel export for all e-commerce UI components
 */

// Designer Profile Components
export { DesignerProfileCard } from './DesignerProfileCard';

// License Components
export {
    LicenseCard,
    LicenseSelector,
    DEFAULT_LICENSE_OPTIONS,
    type LicenseOption,
} from './LicenseCard';

// Manufacturing Components
export {
    ManufacturerCard,
    QuoteCard,
    QuoteRequestForm,
    type ManufacturerData,
    type QuoteData,
} from './ManufacturingCard';

// Checkout Components
export {
    CheckoutModal,
    OrderCard,
    type CheckoutItem,
    type PaymentMethod,
    type CheckoutFormData,
} from './CheckoutModal';

// Trust Badge Components
export {
    TrustBadge,
    TrustTierBadge,
    TrustScoreDisplay,
    BadgeCollection,
    DisputeStatusBadge,
    VerificationStatus,
    type TrustTier,
} from './TrustBadge';
