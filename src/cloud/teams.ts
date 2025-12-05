/**
 * Team Management Service
 *
 * Handles team and organization management including RBAC,
 * invitations, and team collaboration features.
 */

import { getSupabaseClient } from './supabase';
import { auth } from './auth';
import type {
    Team,
    TeamMember,
    TeamInvitation,
    TeamActivity,
    TeamRole,
    Organization,
    PaginatedResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface CreateTeamRequest {
    name: string;
    description?: string;
    avatarUrl?: string;
    organizationId?: string;
}

export interface UpdateTeamRequest {
    name?: string;
    description?: string;
    avatarUrl?: string;
}

export interface InviteMemberRequest {
    email: string;
    role: TeamRole;
}

export interface TeamPermissions {
    canViewTeam: boolean;
    canEditTeam: boolean;
    canDeleteTeam: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canManageRoles: boolean;
    canViewDesigns: boolean;
    canEditDesigns: boolean;
    canDeleteDesigns: boolean;
    canManageAssets: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_HIERARCHY: Record<TeamRole, number> = {
    owner: 4,
    admin: 3,
    designer: 2,
    viewer: 1,
};

const ROLE_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
    owner: {
        canViewTeam: true,
        canEditTeam: true,
        canDeleteTeam: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canManageRoles: true,
        canViewDesigns: true,
        canEditDesigns: true,
        canDeleteDesigns: true,
        canManageAssets: true,
    },
    admin: {
        canViewTeam: true,
        canEditTeam: true,
        canDeleteTeam: false,
        canInviteMembers: true,
        canRemoveMembers: true,
        canManageRoles: false,
        canViewDesigns: true,
        canEditDesigns: true,
        canDeleteDesigns: true,
        canManageAssets: true,
    },
    designer: {
        canViewTeam: true,
        canEditTeam: false,
        canDeleteTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageRoles: false,
        canViewDesigns: true,
        canEditDesigns: true,
        canDeleteDesigns: false,
        canManageAssets: true,
    },
    viewer: {
        canViewTeam: true,
        canEditTeam: false,
        canDeleteTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageRoles: false,
        canViewDesigns: true,
        canEditDesigns: false,
        canDeleteDesigns: false,
        canManageAssets: false,
    },
};

// ============================================================================
// Team Service Class
// ============================================================================

class TeamService {
    private teamCache: Map<string, Team> = new Map();
    private memberCache: Map<string, TeamMember[]> = new Map();

    /**
     * Create a new team
     */
    async createTeam(
        request: CreateTeamRequest
    ): Promise<{ team: Team | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { team: null, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            // Generate slug from name
            const slug = this.generateSlug(request.name);

            const teamData = {
                organization_id: request.organizationId || null,
                name: request.name,
                slug,
                description: request.description || null,
                avatar_url: request.avatarUrl || null,
                is_personal: false,
            };

            const { data, error } = await client
                .from('teams')
                .insert(teamData)
                .select()
                .single();

            if (error) {
                return { team: null, error: error.message };
            }

            const team = this.mapTeamRow(data);

            // Add creator as owner
            await this.addMember(team.id, user.id, 'owner');

            // Log activity
            await this.logActivity(team.id, user.id, 'team_created', 'team', team.id, team.name);

            // Cache
            this.teamCache.set(team.id, team);

            return { team, error: null };
        } catch (error) {
            return {
                team: null,
                error: error instanceof Error ? error.message : 'Failed to create team',
            };
        }
    }

    /**
     * Get team by ID
     */
    async getTeam(teamId: string): Promise<Team | null> {
        // Check cache
        const cached = this.teamCache.get(teamId);

        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (error || !data) {
                return cached || null;
            }

            const team = this.mapTeamRow(data);
            this.teamCache.set(team.id, team);

            return team;
        } catch {
            return cached || null;
        }
    }

    /**
     * Update team
     */
    async updateTeam(
        teamId: string,
        updates: UpdateTeamRequest
    ): Promise<{ team: Team | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { team: null, error: 'Not authenticated' };
        }

        // Check permissions
        const permissions = await this.getPermissions(teamId);
        if (!permissions.canEditTeam) {
            return { team: null, error: 'Not authorized to edit team' };
        }

        const client = getSupabaseClient();

        try {
            const updateData: Record<string, unknown> = {};
            if (updates.name !== undefined) {
                updateData.name = updates.name;
                updateData.slug = this.generateSlug(updates.name);
            }
            if (updates.description !== undefined) {
                updateData.description = updates.description;
            }
            if (updates.avatarUrl !== undefined) {
                updateData.avatar_url = updates.avatarUrl;
            }

            const { data, error } = await client
                .from('teams')
                .update(updateData)
                .eq('id', teamId)
                .select()
                .single();

            if (error) {
                return { team: null, error: error.message };
            }

            const team = this.mapTeamRow(data);
            this.teamCache.set(team.id, team);

            // Log activity
            await this.logActivity(teamId, user.id, 'team_updated', 'team', teamId, team.name);

            return { team, error: null };
        } catch (error) {
            return {
                team: null,
                error: error instanceof Error ? error.message : 'Failed to update team',
            };
        }
    }

    /**
     * Delete team
     */
    async deleteTeam(teamId: string): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check permissions
        const permissions = await this.getPermissions(teamId);
        if (!permissions.canDeleteTeam) {
            return { success: false, error: 'Not authorized to delete team' };
        }

        const client = getSupabaseClient();

        try {
            // Delete team members first
            await client.from('team_members').delete().eq('team_id', teamId);

            // Delete team
            const { error } = await client.from('teams').delete().eq('id', teamId) as { error: { message: string } | null };

            if (error) {
                return { success: false, error: error.message };
            }

            // Clear cache
            this.teamCache.delete(teamId);
            this.memberCache.delete(teamId);

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete team',
            };
        }
    }

    /**
     * Get user's teams
     */
    async getMyTeams(): Promise<Team[]> {
        const user = auth.getUser();
        if (!user) return [];

        const client = getSupabaseClient();

        try {
            // Get team memberships
            const { data: memberships } = await client
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id);

            if (!memberships || memberships.length === 0) {
                return [];
            }

            const teamIds = (memberships as Array<{ team_id: string }>).map(m => m.team_id);

            // Get teams
            const { data: teams } = await client
                .from('teams')
                .select('*')
                .in('id', teamIds);

            return (teams as any[] || []).map(this.mapTeamRow.bind(this));
        } catch {
            return [];
        }
    }

    /**
     * Get team members
     */
    async getMembers(teamId: string): Promise<TeamMember[]> {
        // Check cache
        const cached = this.memberCache.get(teamId);

        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('team_members')
                .select('*')
                .eq('team_id', teamId);

            if (error || !data) {
                return cached || [];
            }

            const members = (data as any[]).map(row => this.mapMemberRow(row));

            // Load user details for each member
            const userIds = members.map(m => m.userId);
            const { data: users } = await client.from('users').select('id, email, display_name, avatar_url').in('id', userIds);

            const userMap = new Map((users as any[] || []).map(u => [u.id, u]));

            const membersWithUsers = members.map(member => {
                const user = userMap.get(member.userId);
                return {
                    ...member,
                    user: {
                        id: member.userId,
                        email: user?.email || '',
                        displayName: user?.display_name || null,
                        avatarUrl: user?.avatar_url || null,
                    },
                };
            });

            this.memberCache.set(teamId, membersWithUsers);

            return membersWithUsers;
        } catch {
            return cached || [];
        }
    }

    /**
     * Add team member
     */
    async addMember(
        teamId: string,
        userId: string,
        role: TeamRole
    ): Promise<{ member: TeamMember | null; error: string | null }> {
        const client = getSupabaseClient();

        try {
            const memberData = {
                team_id: teamId,
                user_id: userId,
                role,
            };

            const { data, error } = await client
                .from('team_members')
                .insert(memberData)
                .select()
                .single();

            if (error) {
                return { member: null, error: error.message };
            }

            const member = this.mapMemberRow(data);

            // Clear cache
            this.memberCache.delete(teamId);

            return { member, error: null };
        } catch (error) {
            return {
                member: null,
                error: error instanceof Error ? error.message : 'Failed to add member',
            };
        }
    }

    /**
     * Remove team member
     */
    async removeMember(
        teamId: string,
        userId: string
    ): Promise<{ success: boolean; error: string | null }> {
        const currentUser = auth.getUser();
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check permissions
        const permissions = await this.getPermissions(teamId);
        if (!permissions.canRemoveMembers && userId !== currentUser.id) {
            return { success: false, error: 'Not authorized to remove members' };
        }

        // Prevent removing the last owner
        const members = await this.getMembers(teamId);
        const owners = members.filter(m => m.role === 'owner');
        const targetMember = members.find(m => m.userId === userId);

        if (targetMember?.role === 'owner' && owners.length === 1) {
            return { success: false, error: 'Cannot remove the last owner' };
        }

        const client = getSupabaseClient();

        try {
            // Use any for chained .eq() calls
            const { error } = await (client
                .from('team_members')
                .delete()
                .eq('team_id', teamId) as any)
                .eq('user_id', userId) as { error: { message: string } | null };

            if (error) {
                return { success: false, error: error.message };
            }

            // Clear cache
            this.memberCache.delete(teamId);

            // Log activity
            await this.logActivity(
                teamId,
                currentUser.id,
                'member_removed',
                'member',
                userId,
                null
            );

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove member',
            };
        }
    }

    /**
     * Update member role
     */
    async updateMemberRole(
        teamId: string,
        userId: string,
        newRole: TeamRole
    ): Promise<{ success: boolean; error: string | null }> {
        const currentUser = auth.getUser();
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check permissions
        const permissions = await this.getPermissions(teamId);
        if (!permissions.canManageRoles) {
            return { success: false, error: 'Not authorized to manage roles' };
        }

        // Get current member role
        const members = await this.getMembers(teamId);
        const targetMember = members.find(m => m.userId === userId);
        const currentUserMember = members.find(m => m.userId === currentUser.id);

        if (!targetMember) {
            return { success: false, error: 'Member not found' };
        }

        // Cannot promote to a role higher than your own
        if (currentUserMember && ROLE_HIERARCHY[newRole] > ROLE_HIERARCHY[currentUserMember.role]) {
            return { success: false, error: 'Cannot promote to a role higher than your own' };
        }

        // Prevent demoting the last owner
        if (targetMember.role === 'owner' && newRole !== 'owner') {
            const owners = members.filter(m => m.role === 'owner');
            if (owners.length === 1) {
                return { success: false, error: 'Cannot demote the last owner' };
            }
        }

        const client = getSupabaseClient();

        try {
            // Use any for chained update queries
            const { error } = await (client
                .from('team_members')
                .update({ role: newRole })
                .eq('team_id', teamId) as any)
                .eq('user_id', userId) as { error: { message: string } | null };

            if (error) {
                return { success: false, error: error.message };
            }

            // Clear cache
            this.memberCache.delete(teamId);

            // Log activity
            await this.logActivity(
                teamId,
                currentUser.id,
                'role_updated',
                'member',
                userId,
                newRole
            );

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update role',
            };
        }
    }

    /**
     * Send team invitation
     */
    async inviteMember(
        teamId: string,
        request: InviteMemberRequest
    ): Promise<{ invitation: TeamInvitation | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { invitation: null, error: 'Not authenticated' };
        }

        // Check permissions
        const permissions = await this.getPermissions(teamId);
        if (!permissions.canInviteMembers) {
            return { invitation: null, error: 'Not authorized to invite members' };
        }

        // Check if already a member
        const members = await this.getMembers(teamId);
        const existingMember = members.find(
            m => m.user.email.toLowerCase() === request.email.toLowerCase()
        );
        if (existingMember) {
            return { invitation: null, error: 'User is already a member' };
        }

        // Generate invitation token
        const token = this.generateInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation: TeamInvitation = {
            id: `invite_${Date.now()}`,
            teamId,
            email: request.email,
            role: request.role,
            token,
            invitedBy: user.id,
            expiresAt,
            acceptedAt: null,
            createdAt: new Date(),
        };

        // In production, this would persist to team_invitations table
        // and send an email notification

        // Log activity
        await this.logActivity(
            teamId,
            user.id,
            'invite_sent',
            'invitation',
            invitation.id,
            request.email
        );

        return { invitation, error: null };
    }

    /**
     * Accept team invitation
     */
    async acceptInvitation(token: string): Promise<{ team: Team | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { team: null, error: 'Not authenticated' };
        }

        // In production, this would verify the token and add the user
        // For now, return a placeholder error
        return { team: null, error: 'Invalid invitation token' };
    }

    /**
     * Get user's permissions in a team
     */
    async getPermissions(teamId: string): Promise<TeamPermissions> {
        const user = auth.getUser();
        if (!user) {
            return this.getEmptyPermissions();
        }

        const members = await this.getMembers(teamId);
        const membership = members.find(m => m.userId === user.id);

        if (!membership) {
            return this.getEmptyPermissions();
        }

        return ROLE_PERMISSIONS[membership.role];
    }

    /**
     * Get user's role in a team
     */
    async getUserRole(teamId: string, userId?: string): Promise<TeamRole | null> {
        const targetId = userId || auth.getUser()?.id;
        if (!targetId) return null;

        const members = await this.getMembers(teamId);
        const membership = members.find(m => m.userId === targetId);

        return membership?.role || null;
    }

    /**
     * Get team activity log
     */
    async getActivity(
        teamId: string,
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<TeamActivity>> {
        // In production, this would query team_activity table
        return {
            data: [],
            total: 0,
            page,
            pageSize,
            hasMore: false,
        };
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Generate URL-safe slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }

    /**
     * Generate invitation token
     */
    private generateInviteToken(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * Log team activity
     */
    private async logActivity(
        teamId: string,
        userId: string,
        action: string,
        resourceType: TeamActivity['resourceType'],
        resourceId: string,
        resourceName: string | null
    ): Promise<void> {
        // In production, this would insert into team_activity table
        console.log(
            `[Team] Activity: ${action} on ${resourceType} ${resourceId} in team ${teamId}`
        );
    }

    /**
     * Get empty permissions object
     */
    private getEmptyPermissions(): TeamPermissions {
        return {
            canViewTeam: false,
            canEditTeam: false,
            canDeleteTeam: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canManageRoles: false,
            canViewDesigns: false,
            canEditDesigns: false,
            canDeleteDesigns: false,
            canManageAssets: false,
        };
    }

    /**
     * Map database row to Team
     */
    private mapTeamRow(row: any): Team {
        return {
            id: row.id,
            organizationId: row.organization_id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            avatarUrl: row.avatar_url,
            isPersonal: row.is_personal,
            memberCount: row.member_count || 0,
            designCount: row.design_count || 0,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    /**
     * Map database row to TeamMember
     */
    private mapMemberRow(row: any): TeamMember {
        return {
            id: row.id,
            teamId: row.team_id,
            userId: row.user_id,
            role: row.role,
            joinedAt: new Date(row.joined_at),
            invitedBy: row.invited_by,
            user: {
                id: row.user_id,
                email: '',
                displayName: null,
                avatarUrl: null,
            },
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const teamService = new TeamService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const teams = {
    create: (request: CreateTeamRequest) => teamService.createTeam(request),
    get: (teamId: string) => teamService.getTeam(teamId),
    update: (teamId: string, updates: UpdateTeamRequest) =>
        teamService.updateTeam(teamId, updates),
    delete: (teamId: string) => teamService.deleteTeam(teamId),
    getMyTeams: () => teamService.getMyTeams(),
    getMembers: (teamId: string) => teamService.getMembers(teamId),
    addMember: (teamId: string, userId: string, role: TeamRole) =>
        teamService.addMember(teamId, userId, role),
    removeMember: (teamId: string, userId: string) =>
        teamService.removeMember(teamId, userId),
    updateRole: (teamId: string, userId: string, role: TeamRole) =>
        teamService.updateMemberRole(teamId, userId, role),
    invite: (teamId: string, request: InviteMemberRequest) =>
        teamService.inviteMember(teamId, request),
    acceptInvite: (token: string) => teamService.acceptInvitation(token),
    getPermissions: (teamId: string) => teamService.getPermissions(teamId),
    getUserRole: (teamId: string, userId?: string) =>
        teamService.getUserRole(teamId, userId),
    getActivity: (teamId: string, page?: number, pageSize?: number) =>
        teamService.getActivity(teamId, page, pageSize),
};

export default teams;
