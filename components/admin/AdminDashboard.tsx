/**
 * Admin Dashboard Component
 * Moderation interface for marketplace content
 */

import * as React from 'react';
import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ModerationItem {
    id: string;
    type: 'design' | 'designer' | 'review' | 'dispute' | 'report';
    status: 'pending' | 'approved' | 'rejected' | 'escalated';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    description: string;
    reportReason?: string;
    submittedBy: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    targetUser?: {
        id: string;
        name: string;
    };
    imageUrl?: string;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}

export interface AdminStats {
    pendingReviews: number;
    approvedToday: number;
    rejectedToday: number;
    escalatedIssues: number;
    avgResponseTime: number; // in hours
    totalDesigns: number;
    totalDesigners: number;
    totalSales: number;
}

export interface AuditLogEntry {
    id: string;
    action: string;
    performedBy: string;
    targetId: string;
    targetType: string;
    details: string;
    timestamp: Date;
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

const mockStats: AdminStats = {
    pendingReviews: 24,
    approvedToday: 156,
    rejectedToday: 12,
    escalatedIssues: 3,
    avgResponseTime: 2.4,
    totalDesigns: 15420,
    totalDesigners: 2847,
    totalSales: 89234,
};

const mockModerationQueue: ModerationItem[] = [
    {
        id: 'mod_1',
        type: 'design',
        status: 'pending',
        priority: 'medium',
        title: 'New Design Submission',
        description: 'Minimalist summer dress with floral patterns',
        submittedBy: { id: 'user_1', name: 'Alice Chen', avatarUrl: '' },
        imageUrl: 'https://placehold.co/400x400/1e293b/94a3b8?text=Design',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
        id: 'mod_2',
        type: 'report',
        status: 'pending',
        priority: 'high',
        title: 'Copyright Infringement Report',
        description: 'User reports potential IP violation',
        reportReason: 'This design copies my original work from 2023',
        submittedBy: { id: 'user_2', name: 'Marcus Johnson', avatarUrl: '' },
        targetUser: { id: 'user_3', name: 'ShadyDesigner' },
        imageUrl: 'https://placehold.co/400x400/1e293b/94a3b8?text=Reported',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
        id: 'mod_3',
        type: 'dispute',
        status: 'escalated',
        priority: 'urgent',
        title: 'Payment Dispute',
        description: 'Buyer claims product not as described',
        submittedBy: { id: 'user_4', name: 'Emma Wilson', avatarUrl: '' },
        targetUser: { id: 'user_5', name: 'FastFashion Co' },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
        id: 'mod_4',
        type: 'designer',
        status: 'pending',
        priority: 'low',
        title: 'Verification Request',
        description: 'Designer requesting verified badge',
        submittedBy: { id: 'user_6', name: 'Studio Milano', avatarUrl: '' },
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
];

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: { value: number; positive: boolean };
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon, color }) => (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                {icon}
            </div>
            {trend && (
                <span className={`text-sm font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
            )}
        </div>
        <div className="text-3xl font-black text-white mb-1">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
    </div>
);

interface ModerationCardProps {
    item: ModerationItem;
    onApprove: () => void;
    onReject: () => void;
    onEscalate: () => void;
    onViewDetails: () => void;
}

const ModerationCard: React.FC<ModerationCardProps> = ({
    item,
    onApprove,
    onReject,
    onEscalate,
    onViewDetails,
}) => {
    const priorityColors: Record<string, string> = {
        low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const typeIcons: Record<string, string> = {
        design: '🎨',
        designer: '👤',
        review: '⭐',
        dispute: '⚖️',
        report: '🚩',
    };

    const timeAgo = (date: Date): string => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{typeIcons[item.type]}</span>
                        <div>
                            <h3 className="font-bold text-white text-sm">{item.title}</h3>
                            <span className="text-xs text-slate-500">{timeAgo(item.createdAt)}</span>
                        </div>
                    </div>
                    <span className={`px-2 py-1 text-[10px] rounded-full border uppercase tracking-wider ${priorityColors[item.priority]}`}>
                        {item.priority}
                    </span>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.description}</p>

                {item.reportReason && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-3">
                        <span className="text-xs text-red-400 font-medium">Report Reason:</span>
                        <p className="text-sm text-slate-300 mt-1">{item.reportReason}</p>
                    </div>
                )}

                {/* Image preview */}
                {item.imageUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                        <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-32 object-cover"
                        />
                    </div>
                )}

                {/* Submitter info */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                        {item.submittedBy.name.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-400">{item.submittedBy.name}</span>
                    {item.targetUser && (
                        <>
                            <span className="text-xs text-slate-600">→</span>
                            <span className="text-xs text-slate-400">{item.targetUser.name}</span>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onApprove}
                        className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-500 transition-colors"
                    >
                        Approve
                    </button>
                    <button
                        onClick={onReject}
                        className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500 transition-colors"
                    >
                        Reject
                    </button>
                    <button
                        onClick={onEscalate}
                        className="py-2 px-3 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-500 transition-colors"
                        title="Escalate"
                    >
                        ↑
                    </button>
                    <button
                        onClick={onViewDetails}
                        className="py-2 px-3 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition-colors"
                        title="View Details"
                    >
                        •••
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface AdminDashboardProps {
    onFetchStats?: () => Promise<AdminStats>;
    onFetchQueue?: (filter: string) => Promise<ModerationItem[]>;
    onModerateItem?: (itemId: string, action: 'approve' | 'reject' | 'escalate') => Promise<void>;
    className?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    onFetchStats,
    onFetchQueue,
    onModerateItem,
    className = '',
}) => {
    const [stats, setStats] = useState<AdminStats>(mockStats);
    const [queue, setQueue] = useState<ModerationItem[]>(mockModerationQueue);
    const [filter, setFilter] = useState<'all' | 'pending' | 'escalated'>('pending');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);

    // Fetch stats on mount
    useEffect(() => {
        if (onFetchStats) {
            onFetchStats().then(setStats);
        }
    }, [onFetchStats]);

    // Fetch queue when filter changes
    useEffect(() => {
        if (onFetchQueue) {
            setIsLoading(true);
            onFetchQueue(filter).then(items => {
                setQueue(items);
                setIsLoading(false);
            });
        }
    }, [filter, onFetchQueue]);

    const handleModerate = async (itemId: string, action: 'approve' | 'reject' | 'escalate') => {
        if (onModerateItem) {
            await onModerateItem(itemId, action);
        }
        // Remove from queue after action
        setQueue(prev => prev.filter(item => item.id !== itemId));
    };

    const filteredQueue = queue.filter(item => {
        if (filter === 'pending' && item.status !== 'pending') return false;
        if (filter === 'escalated' && item.status !== 'escalated') return false;
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        return true;
    });

    return (
        <div className={`min-h-screen bg-[#060912] ${className}`}>
            {/* Header */}
            <div className="border-b border-white/5 bg-[#0B0F19]">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
                            <p className="text-sm text-slate-500">Content moderation & platform management</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                                Export Report
                            </button>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors">
                                Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Pending Reviews"
                        value={stats.pendingReviews}
                        trend={{ value: 12, positive: false }}
                        color="bg-amber-500/10"
                        icon={<span className="text-amber-400 text-xl">📋</span>}
                    />
                    <StatCard
                        label="Approved Today"
                        value={stats.approvedToday}
                        trend={{ value: 8, positive: true }}
                        color="bg-emerald-500/10"
                        icon={<span className="text-emerald-400 text-xl">✓</span>}
                    />
                    <StatCard
                        label="Escalated Issues"
                        value={stats.escalatedIssues}
                        color="bg-red-500/10"
                        icon={<span className="text-red-400 text-xl">⚠️</span>}
                    />
                    <StatCard
                        label="Avg Response Time"
                        value={`${stats.avgResponseTime}h`}
                        trend={{ value: 15, positive: true }}
                        color="bg-blue-500/10"
                        icon={<span className="text-blue-400 text-xl">⏱️</span>}
                    />
                </div>

                {/* Platform Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-center">
                        <div className="text-3xl font-black text-white">{stats.totalDesigns.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">Total Designs</div>
                    </div>
                    <div className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-center">
                        <div className="text-3xl font-black text-white">{stats.totalDesigners.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">Active Designers</div>
                    </div>
                    <div className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-center">
                        <div className="text-3xl font-black text-emerald-400">${(stats.totalSales).toLocaleString()}</div>
                        <div className="text-sm text-slate-500">Total Sales</div>
                    </div>
                </div>

                {/* Moderation Queue */}
                <div className="bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Moderation Queue</h2>
                            <div className="flex gap-2">
                                {/* Status Filter */}
                                <div className="flex bg-slate-800/50 rounded-lg p-1">
                                    {(['all', 'pending', 'escalated'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                {/* Type Filter */}
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    aria-label="Filter by type"
                                    title="Filter items by type"
                                    className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="design">Designs</option>
                                    <option value="designer">Designers</option>
                                    <option value="report">Reports</option>
                                    <option value="dispute">Disputes</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-500">Loading queue...</p>
                            </div>
                        ) : filteredQueue.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-4xl mb-4 block">✨</span>
                                <p className="text-slate-400 font-medium">Queue is empty!</p>
                                <p className="text-sm text-slate-500">No items match your current filters</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredQueue.map((item) => (
                                    <ModerationCard
                                        key={item.id}
                                        item={item}
                                        onApprove={() => handleModerate(item.id, 'approve')}
                                        onReject={() => handleModerate(item.id, 'reject')}
                                        onEscalate={() => handleModerate(item.id, 'escalate')}
                                        onViewDetails={() => setSelectedItem(item)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-left hover:border-white/10 transition-colors group">
                        <span className="text-2xl mb-3 block">🔍</span>
                        <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Search Users</h3>
                        <p className="text-sm text-slate-500 mt-1">Find and manage user accounts</p>
                    </button>
                    <button className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-left hover:border-white/10 transition-colors group">
                        <span className="text-2xl mb-3 block">📊</span>
                        <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Analytics</h3>
                        <p className="text-sm text-slate-500 mt-1">View platform analytics and reports</p>
                    </button>
                    <button className="bg-[#0B0F19] rounded-2xl border border-white/5 p-6 text-left hover:border-white/10 transition-colors group">
                        <span className="text-2xl mb-3 block">⚙️</span>
                        <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Platform Settings</h3>
                        <p className="text-sm text-slate-500 mt-1">Configure platform rules and fees</p>
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0B0F19] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{selectedItem.title}</h3>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Type</label>
                                    <p className="text-white capitalize">{selectedItem.type}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
                                    <p className="text-slate-300">{selectedItem.description}</p>
                                </div>
                                {selectedItem.reportReason && (
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider">Report Reason</label>
                                        <p className="text-red-400">{selectedItem.reportReason}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider">Submitted By</label>
                                    <p className="text-white">{selectedItem.submittedBy.name}</p>
                                </div>
                                {selectedItem.targetUser && (
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider">Target User</label>
                                        <p className="text-white">{selectedItem.targetUser.name}</p>
                                    </div>
                                )}
                                {selectedItem.imageUrl && (
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider">Image</label>
                                        <img
                                            src={selectedItem.imageUrl}
                                            alt={selectedItem.title}
                                            className="w-full max-h-64 object-contain rounded-lg border border-white/10 mt-2"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => {
                                    handleModerate(selectedItem.id, 'approve');
                                    setSelectedItem(null);
                                }}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-emerald-500 transition-colors"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => {
                                    handleModerate(selectedItem.id, 'reject');
                                    setSelectedItem(null);
                                }}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-red-500 transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    handleModerate(selectedItem.id, 'escalate');
                                    setSelectedItem(null);
                                }}
                                className="py-3 px-6 bg-amber-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-amber-500 transition-colors"
                            >
                                Escalate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
