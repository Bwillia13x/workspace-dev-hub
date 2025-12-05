import React, { Component, ReactNode, ErrorInfo, ComponentType } from 'react';
import { categorizeError, getUserFriendlyMessage, ErrorCategory } from '../src/core/errors';
import { captureException, addBreadcrumb } from '../src/core/error-tracking';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in child tree
 * and displays a fallback UI instead of crashing the whole application
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({ errorInfo });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send to error tracking service
        captureException(error, {
            component: 'ErrorBoundary',
            action: 'componentDidCatch',
            extra: {
                componentStack: errorInfo.componentStack,
            },
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError && error) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            const categorized = categorizeError(error);
            const userMessage = getUserFriendlyMessage(categorized);
            const showRetry = categorized.retryable;

            // Determine icon based on error category
            const iconPath = getErrorIcon(categorized.category);

            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
                    <div className="max-w-md w-full text-center bg-slate-900/80 p-8 rounded-2xl border border-red-500/20 backdrop-blur-sm">
                        {/* Error Icon */}
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-8 h-8 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={iconPath}
                                />
                            </svg>
                        </div>

                        {/* Error Title */}
                        <h1 className="text-2xl font-bold mb-3">
                            Something went wrong
                        </h1>

                        {/* Error Message */}
                        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                            {userMessage}
                        </p>

                        {/* Error Details (dev only) */}
                        {import.meta.env?.DEV && (
                            <details className="text-left mb-6 bg-slate-800/50 rounded-lg p-4">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                                    Technical Details
                                </summary>
                                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40">
                                    {error.message}
                                    {'\n\n'}
                                    {error.stack}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {showRetry && (
                                <button
                                    onClick={this.handleReset}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
                                >
                                    Try Again
                                </button>
                            )}
                            <button
                                onClick={this.handleReload}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
                            >
                                Reload Page
                            </button>
                        </div>

                        {/* Help Link */}
                        <p className="mt-6 text-xs text-slate-500">
                            If this problem persists, please{' '}
                            <a
                                href="mailto:support@nanofashion.studio"
                                className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                                contact support
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return children;
    }
}

/**
 * Get SVG path for error icon based on category
 */
function getErrorIcon(category: ErrorCategory): string {
    switch (category) {
        case ErrorCategory.NETWORK:
            // Wifi off icon
            return 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0';
        case ErrorCategory.AUTHENTICATION:
            // Lock icon
            return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
        case ErrorCategory.RATE_LIMIT:
            // Clock icon
            return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
        case ErrorCategory.VALIDATION:
            // X circle icon
            return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
        case ErrorCategory.STORAGE:
            // Database icon
            return 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4';
        default:
            // Warning triangle icon
            return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
    }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

export default ErrorBoundary;
