/**
 * History Module - Phase 4 Professional Design Tools
 *
 * Exports comprehensive undo/redo system.
 */

export {
    HistoryManager,
    createDocumentHistory,
    createDesignHistory,
    type HistoryState,
    type StateMetadata,
    type HistoryBranch,
    type HistoryConfig,
    type HistoryStats,
    type HistoryEvent,
    type Transaction
} from './history-manager';
