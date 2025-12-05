import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function that wraps components with necessary providers
 */
interface AllTheProvidersProps {
    children: ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
    // Add providers here as the app grows (QueryClient, AuthProvider, etc.)
    return <>{children}</>;
};

/**
 * Custom render function with all providers
 */
const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

/**
 * Render with user event setup for simulating user interactions
 */
const renderWithUser = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
    return {
        user: userEvent.setup(),
        ...customRender(ui, options),
    };
};

/**
 * Create a mock base64 image string for testing
 */
export const createMockBase64Image = (): string => {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
};

/**
 * Create a mock Product for testing
 */
export const createMockProduct = (overrides = {}) => ({
    id: 'test-product-1',
    name: 'Test Product',
    description: 'A test product description',
    price: 99.99,
    imageUrl: createMockBase64Image(),
    creator: 'Test Creator',
    likes: 10,
    ...overrides,
});

/**
 * Create a mock DesignDraft for testing
 */
export const createMockDesignDraft = (overrides = {}) => ({
    conceptImage: null,
    cadImage: null,
    materials: '',
    history: [],
    ...overrides,
});

/**
 * Create a mock SavedDraft for testing
 */
export const createMockSavedDraft = (overrides = {}) => ({
    id: 'test-draft-1',
    name: 'Test Draft',
    timestamp: Date.now(),
    data: createMockDesignDraft(),
    prompt: 'Test prompt',
    ...overrides,
});

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Re-export everything from testing-library
export * from '@testing-library/react';

// Export custom functions
export { customRender as render, renderWithUser };
