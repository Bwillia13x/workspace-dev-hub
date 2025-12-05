/**
 * Network Status Hook
 * 
 * Provides real-time network connectivity status and connection quality
 * information to enable graceful offline handling.
 */

import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkStatus {
    /** Whether the browser has network connectivity */
    isOnline: boolean;
    /** Whether the app can reach the API server */
    isApiReachable: boolean;
    /** Estimated connection quality based on Network Information API */
    connectionQuality: ConnectionQuality;
    /** Estimated downlink speed in Mbps (may be undefined) */
    downlink: number | undefined;
    /** Round-trip time in ms (may be undefined) */
    rtt: number | undefined;
    /** Whether the user is on a metered connection (e.g., mobile data) */
    saveData: boolean;
    /** Timestamp of last connectivity check */
    lastChecked: number;
}

// Extend Navigator to include connection property
interface NavigatorWithConnection extends Navigator {
    connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
        addEventListener: (type: string, listener: () => void) => void;
        removeEventListener: (type: string, listener: () => void) => void;
    };
}

const defaultStatus: NetworkStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isApiReachable: true,
    connectionQuality: 'unknown',
    downlink: undefined,
    rtt: undefined,
    saveData: false,
    lastChecked: Date.now(),
};

/**
 * Hook to monitor network status and connectivity.
 * 
 * @param apiHealthEndpoint - Optional endpoint to check API reachability
 * @param checkInterval - Interval in ms for periodic checks (default: 30000)
 * @returns NetworkStatus object with current connectivity information
 * 
 * @example
 * ```tsx
 * const { isOnline, isApiReachable, connectionQuality } = useNetworkStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineIndicator />;
 * }
 * 
 * if (!isApiReachable) {
 *   return <ApiUnavailable />;
 * }
 * 
 * if (connectionQuality === 'slow-2g' || connectionQuality === '2g') {
 *   return <LowBandwidthMode />;
 * }
 * ```
 */
export function useNetworkStatus(
    apiHealthEndpoint?: string,
    checkInterval: number = 30000
): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>(defaultStatus);

    // Get connection quality from Network Information API
    const getConnectionInfo = useCallback((): Partial<NetworkStatus> => {
        const nav = navigator as NavigatorWithConnection;
        const connection = nav.connection;

        if (!connection) {
            return {
                connectionQuality: 'unknown',
                downlink: undefined,
                rtt: undefined,
                saveData: false,
            };
        }

        const effectiveType = connection.effectiveType;
        let connectionQuality: ConnectionQuality = 'unknown';

        if (effectiveType === 'slow-2g') connectionQuality = 'slow-2g';
        else if (effectiveType === '2g') connectionQuality = '2g';
        else if (effectiveType === '3g') connectionQuality = '3g';
        else if (effectiveType === '4g') connectionQuality = '4g';

        return {
            connectionQuality,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData ?? false,
        };
    }, []);

    // Check if API is reachable
    const checkApiReachability = useCallback(async (): Promise<boolean> => {
        if (!apiHealthEndpoint) return true;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(apiHealthEndpoint, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }, [apiHealthEndpoint]);

    // Update status
    const updateStatus = useCallback(async () => {
        const connectionInfo = getConnectionInfo();
        const isApiReachable = await checkApiReachability();

        setStatus(prev => ({
            ...prev,
            isOnline: navigator.onLine,
            isApiReachable,
            ...connectionInfo,
            lastChecked: Date.now(),
        }));
    }, [getConnectionInfo, checkApiReachability]);

    useEffect(() => {
        // Initial check
        updateStatus();

        // Set up event listeners
        const handleOnline = () => {
            setStatus(prev => ({ ...prev, isOnline: true, lastChecked: Date.now() }));
            updateStatus();
        };

        const handleOffline = () => {
            setStatus(prev => ({
                ...prev,
                isOnline: false,
                isApiReachable: false,
                lastChecked: Date.now()
            }));
        };

        const handleConnectionChange = () => {
            const connectionInfo = getConnectionInfo();
            setStatus(prev => ({ ...prev, ...connectionInfo, lastChecked: Date.now() }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for connection changes if supported
        const nav = navigator as NavigatorWithConnection;
        if (nav.connection) {
            nav.connection.addEventListener('change', handleConnectionChange);
        }

        // Periodic check
        const intervalId = setInterval(updateStatus, checkInterval);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (nav.connection) {
                nav.connection.removeEventListener('change', handleConnectionChange);
            }
            clearInterval(intervalId);
        };
    }, [updateStatus, getConnectionInfo, checkInterval]);

    return status;
}

/**
 * Simple hook to check if online.
 * Use this for basic online/offline checks without API reachability.
 * 
 * @returns Boolean indicating if the browser is online
 */
export function useIsOnline(): boolean {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export default useNetworkStatus;
