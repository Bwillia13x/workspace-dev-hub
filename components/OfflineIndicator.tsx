/**
 * Offline Indicator Component
 * 
 * Displays a visual indicator when the user is offline or has limited connectivity.
 * Provides information about the current network status and queued operations.
 */

import { useState, useEffect } from 'react';
import { useNetworkStatus, ConnectionQuality } from '../src/hooks/useNetworkStatus';

interface OfflineIndicatorProps {
    /** Show detailed connection info */
    showDetails?: boolean;
    /** Custom class name */
    className?: string;
    /** Number of operations waiting to sync */
    queuedOperations?: number;
    /** Callback when user clicks "Retry" */
    onRetry?: () => void;
}

/**
 * Get a user-friendly message based on connection quality
 */
function getQualityMessage(quality: ConnectionQuality): string {
    switch (quality) {
        case 'slow-2g':
            return 'Very slow connection - some features may be limited';
        case '2g':
            return 'Slow connection - image generation may be delayed';
        case '3g':
            return 'Moderate connection';
        case '4g':
            return 'Good connection';
        default:
            return '';
    }
}

/**
 * Get the color scheme based on connection status
 */
function getStatusColors(isOnline: boolean, quality: ConnectionQuality): {
    bg: string;
    border: string;
    text: string;
    icon: string;
} {
    if (!isOnline) {
        return {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400',
            icon: 'text-red-500',
        };
    }

    if (quality === 'slow-2g' || quality === '2g') {
        return {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            text: 'text-amber-400',
            icon: 'text-amber-500',
        };
    }

    return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        icon: 'text-emerald-500',
    };
}

/**
 * Offline indicator that shows current network status
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
    showDetails = false,
    className = '',
    queuedOperations = 0,
    onRetry,
}) => {
    const { isOnline, connectionQuality, downlink, rtt, saveData } = useNetworkStatus();
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Show indicator when offline or on slow connection
    useEffect(() => {
        const shouldShow = !isOnline || connectionQuality === 'slow-2g' || connectionQuality === '2g';
        setIsVisible(shouldShow);
    }, [isOnline, connectionQuality]);

    if (!isVisible) {
        return null;
    }

    const colors = getStatusColors(isOnline, connectionQuality);
    const qualityMessage = getQualityMessage(connectionQuality);

    return (
        <div
            className={`
        fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm
        ${colors.bg} ${colors.border} border
        backdrop-blur-xl rounded-xl shadow-2xl
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        z-50 ${className}
      `}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                            {!isOnline ? (
                                <svg className={`w-5 h-5 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                                </svg>
                            ) : (
                                <svg className={`w-5 h-5 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                            )}
                        </div>

                        {/* Status Text */}
                        <div>
                            <p className={`font-semibold ${colors.text}`}>
                                {!isOnline ? 'You\'re offline' : 'Slow Connection'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {!isOnline
                                    ? 'Changes will sync when reconnected'
                                    : qualityMessage
                                }
                            </p>
                        </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    {showDetails && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                            <svg
                                className={`w-4 h-4 text-slate-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Queued Operations */}
                {queuedOperations > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span>{queuedOperations} operation{queuedOperations !== 1 ? 's' : ''} pending</span>
                    </div>
                )}

                {/* Expanded Details */}
                {showDetails && isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Connection Type</span>
                            <span className="text-slate-300 uppercase">{connectionQuality}</span>
                        </div>
                        {downlink !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Download Speed</span>
                                <span className="text-slate-300">{downlink} Mbps</span>
                            </div>
                        )}
                        {rtt !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Latency</span>
                                <span className="text-slate-300">{rtt} ms</span>
                            </div>
                        )}
                        {saveData && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Data Saver</span>
                                <span className="text-emerald-400">Enabled</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Retry Button */}
                {!isOnline && onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-4 w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                    >
                        Retry Connection
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Minimal offline badge to show in the header/navbar
 */
export const OfflineBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { isOnline, connectionQuality } = useNetworkStatus();

    if (isOnline && connectionQuality !== 'slow-2g' && connectionQuality !== '2g') {
        return null;
    }

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-2 py-1 
        text-xs font-medium rounded-full
        ${!isOnline
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }
        ${className}
      `}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></span>
            {!isOnline ? 'Offline' : 'Slow'}
        </span>
    );
};

export default OfflineIndicator;
