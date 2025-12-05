/**
 * Offline Queue Service
 * 
 * Manages a queue of operations to be executed when the user regains connectivity.
 * Operations are persisted to localStorage to survive page refreshes.
 */

export type OperationType = 'generate' | 'edit' | 'publish' | 'save';

export interface QueuedOperation {
    id: string;
    type: OperationType;
    payload: unknown;
    createdAt: number;
    retryCount: number;
    lastError?: string;
}

export interface OfflineQueueOptions {
    /** Storage key for persisting queue */
    storageKey?: string;
    /** Maximum retry attempts per operation */
    maxRetries?: number;
    /** Callback when operation succeeds */
    onSuccess?: (operation: QueuedOperation) => void;
    /** Callback when operation fails */
    onError?: (operation: QueuedOperation, error: Error) => void;
    /** Callback when queue changes */
    onQueueChange?: (queue: QueuedOperation[]) => void;
}

const DEFAULT_STORAGE_KEY = 'nanofashion_offline_queue';
const DEFAULT_MAX_RETRIES = 3;

/**
 * Create an offline queue manager
 */
export function createOfflineQueue(options: OfflineQueueOptions = {}) {
    const {
        storageKey = DEFAULT_STORAGE_KEY,
        maxRetries = DEFAULT_MAX_RETRIES,
        onSuccess,
        onError,
        onQueueChange,
    } = options;

    let queue: QueuedOperation[] = loadQueue();
    let isProcessing = false;
    let executors: Map<OperationType, (payload: unknown) => Promise<unknown>> = new Map();

    /**
     * Load queue from localStorage
     */
    function loadQueue(): QueuedOperation[] {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load offline queue:', error);
        }
        return [];
    }

    /**
     * Save queue to localStorage
     */
    function saveQueue(): void {
        try {
            localStorage.setItem(storageKey, JSON.stringify(queue));
            onQueueChange?.(queue);
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }

    /**
     * Generate a unique ID for an operation
     */
    function generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add an operation to the queue
     */
    function enqueue(type: OperationType, payload: unknown): string {
        const operation: QueuedOperation = {
            id: generateId(),
            type,
            payload,
            createdAt: Date.now(),
            retryCount: 0,
        };

        queue.push(operation);
        saveQueue();

        // Try to process if online
        if (navigator.onLine) {
            processQueue();
        }

        return operation.id;
    }

    /**
     * Remove an operation from the queue
     */
    function remove(id: string): boolean {
        const index = queue.findIndex(op => op.id === id);
        if (index !== -1) {
            queue.splice(index, 1);
            saveQueue();
            return true;
        }
        return false;
    }

    /**
     * Clear all operations from the queue
     */
    function clear(): void {
        queue = [];
        saveQueue();
    }

    /**
     * Get current queue
     */
    function getQueue(): QueuedOperation[] {
        return [...queue];
    }

    /**
     * Get queue length
     */
    function getLength(): number {
        return queue.length;
    }

    /**
     * Register an executor for an operation type
     */
    function registerExecutor(
        type: OperationType,
        executor: (payload: unknown) => Promise<unknown>
    ): void {
        executors.set(type, executor);
    }

    /**
     * Process the queue
     */
    async function processQueue(): Promise<void> {
        if (isProcessing || queue.length === 0 || !navigator.onLine) {
            return;
        }

        isProcessing = true;

        // Process operations one at a time
        while (queue.length > 0 && navigator.onLine) {
            const operation = queue[0];
            const executor = executors.get(operation.type);

            if (!executor) {
                console.warn(`No executor registered for operation type: ${operation.type}`);
                // Move to end of queue
                queue.push(queue.shift()!);
                continue;
            }

            try {
                await executor(operation.payload);

                // Success - remove from queue
                queue.shift();
                saveQueue();
                onSuccess?.(operation);
            } catch (error) {
                operation.retryCount++;
                operation.lastError = error instanceof Error ? error.message : 'Unknown error';

                if (operation.retryCount >= maxRetries) {
                    // Max retries reached - remove from queue
                    queue.shift();
                    saveQueue();
                    onError?.(operation, error instanceof Error ? error : new Error('Unknown error'));
                } else {
                    // Move to end of queue for retry later
                    queue.push(queue.shift()!);
                    saveQueue();
                }
            }
        }

        isProcessing = false;
    }

    /**
     * Set up automatic processing when coming online
     */
    function startAutoProcessing(): () => void {
        const handleOnline = () => {
            processQueue();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }

    return {
        enqueue,
        remove,
        clear,
        getQueue,
        getLength,
        registerExecutor,
        processQueue,
        startAutoProcessing,
    };
}

/**
 * React hook for using the offline queue
 */
import { useState, useEffect, useMemo, useCallback } from 'react';

export function useOfflineQueue(options: OfflineQueueOptions = {}) {
    const [queue, setQueue] = useState<QueuedOperation[]>([]);

    const offlineQueue = useMemo(() => {
        return createOfflineQueue({
            ...options,
            onQueueChange: (newQueue) => {
                setQueue(newQueue);
                options.onQueueChange?.(newQueue);
            },
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Load initial queue
        setQueue(offlineQueue.getQueue());

        // Start auto-processing
        const cleanup = offlineQueue.startAutoProcessing();

        return cleanup;
    }, [offlineQueue]);

    const enqueue = useCallback(
        (type: OperationType, payload: unknown) => offlineQueue.enqueue(type, payload),
        [offlineQueue]
    );

    const remove = useCallback(
        (id: string) => offlineQueue.remove(id),
        [offlineQueue]
    );

    const clear = useCallback(
        () => offlineQueue.clear(),
        [offlineQueue]
    );

    const processQueue = useCallback(
        () => offlineQueue.processQueue(),
        [offlineQueue]
    );

    const registerExecutor = useCallback(
        (type: OperationType, executor: (payload: unknown) => Promise<unknown>) =>
            offlineQueue.registerExecutor(type, executor),
        [offlineQueue]
    );

    return {
        queue,
        queueLength: queue.length,
        enqueue,
        remove,
        clear,
        processQueue,
        registerExecutor,
    };
}

export default createOfflineQueue;
