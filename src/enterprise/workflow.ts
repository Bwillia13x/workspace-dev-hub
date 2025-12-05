/**
 * Workflow Service - Phase 6 Enterprise & Scale
 *
 * Manages approval workflows, project management (Kanban),
 * organization hierarchy, and time tracking.
 */

import type {
    WorkflowTemplate,
    WorkflowInstance,
    WorkflowStage,
    WorkflowStageStatus,
    WorkflowType,
    WorkflowCondition,
    StageHistoryEntry,
    ApprovalRecord,
    WorkflowComment,
    Project,
    ProjectStatus,
    Task,
    TaskStatus,
    TaskPriority,
    KanbanColumn,
    TimeEntry,
    ChecklistItem,
    TaskComment,
    OrganizationUnit,
    OrgUnitType,
    ProjectBudget,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default workflow stages for design approval
 */
export const DEFAULT_DESIGN_APPROVAL_STAGES: Omit<WorkflowStage, 'id'>[] = [
    {
        name: 'Initial Review',
        description: 'First review of design concept',
        order: 1,
        approvers: ['designer_lead'],
        minApprovals: 1,
        timeoutHours: 24,
        timeoutAction: 'notify',
        notifications: {
            onEnter: true,
            onApprove: true,
            onReject: true,
            onTimeout: true,
            channels: ['email', 'in_app'],
        },
    },
    {
        name: 'Creative Director Review',
        description: 'Review by creative director for brand alignment',
        order: 2,
        approvers: ['creative_director'],
        minApprovals: 1,
        timeoutHours: 48,
        timeoutAction: 'escalate',
        escalationTarget: 'design_manager',
        notifications: {
            onEnter: true,
            onApprove: true,
            onReject: true,
            onTimeout: true,
            channels: ['email', 'slack', 'in_app'],
        },
    },
    {
        name: 'Final Approval',
        description: 'Final sign-off before publication',
        order: 3,
        approvers: ['brand_manager', 'legal'],
        minApprovals: 2,
        timeoutHours: 72,
        timeoutAction: 'notify',
        requiredFields: ['pricing', 'licensing_terms'],
        notifications: {
            onEnter: true,
            onApprove: true,
            onReject: true,
            onTimeout: true,
            channels: ['email', 'in_app'],
        },
    },
];

/**
 * Default Kanban columns
 */
export const DEFAULT_KANBAN_COLUMNS: Omit<KanbanColumn, 'id' | 'taskIds'>[] = [
    { name: 'Backlog', order: 1, color: '#6b7280' },
    { name: 'To Do', order: 2, color: '#3b82f6', wipLimit: 10 },
    { name: 'In Progress', order: 3, color: '#f59e0b', wipLimit: 5 },
    { name: 'Review', order: 4, color: '#8b5cf6', wipLimit: 3 },
    { name: 'Done', order: 5, color: '#10b981' },
];

// ============================================================================
// STORES (Mock for development)
// ============================================================================

const workflowTemplateStore = new Map<string, WorkflowTemplate>();
const workflowInstanceStore = new Map<string, WorkflowInstance>();
const projectStore = new Map<string, Project>();
const taskStore = new Map<string, Task>();
const orgUnitStore = new Map<string, OrganizationUnit>();

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// WORKFLOW TEMPLATE SERVICE
// ============================================================================

/**
 * Create a workflow template
 */
export async function createWorkflowTemplate(params: {
    tenantId: string;
    name: string;
    description: string;
    type: WorkflowType;
    stages: Omit<WorkflowStage, 'id'>[];
    isDefault?: boolean;
    createdBy: string;
}): Promise<{ template: WorkflowTemplate | null; error: string | null }> {
    try {
        const now = new Date();
        const stages: WorkflowStage[] = params.stages.map((stage, index) => ({
            ...stage,
            id: generateId(),
            order: index + 1,
        }));

        const template: WorkflowTemplate = {
            id: generateId(),
            tenantId: params.tenantId,
            name: params.name,
            description: params.description,
            type: params.type,
            stages,
            isDefault: params.isDefault || false,
            isActive: true,
            createdBy: params.createdBy,
            createdAt: now,
            updatedAt: now,
        };

        // If setting as default, unset other defaults of same type
        if (template.isDefault) {
            for (const existing of workflowTemplateStore.values()) {
                if (
                    existing.tenantId === params.tenantId &&
                    existing.type === params.type &&
                    existing.isDefault
                ) {
                    existing.isDefault = false;
                    workflowTemplateStore.set(existing.id, existing);
                }
            }
        }

        workflowTemplateStore.set(template.id, template);
        console.log(`[Workflow] Created template: ${template.name} (${template.id})`);

        return { template, error: null };
    } catch (error) {
        return { template: null, error: (error as Error).message };
    }
}

/**
 * Get workflow template by ID
 */
export async function getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return workflowTemplateStore.get(templateId) || null;
}

/**
 * List workflow templates for tenant
 */
export async function listWorkflowTemplates(
    tenantId: string,
    type?: WorkflowType
): Promise<WorkflowTemplate[]> {
    let templates = Array.from(workflowTemplateStore.values()).filter(
        t => t.tenantId === tenantId && t.isActive
    );

    if (type) {
        templates = templates.filter(t => t.type === type);
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get default template for workflow type
 */
export async function getDefaultTemplate(
    tenantId: string,
    type: WorkflowType
): Promise<WorkflowTemplate | null> {
    for (const template of workflowTemplateStore.values()) {
        if (template.tenantId === tenantId && template.type === type && template.isDefault) {
            return template;
        }
    }
    return null;
}

/**
 * Update workflow template
 */
export async function updateWorkflowTemplate(
    templateId: string,
    updates: Partial<Pick<WorkflowTemplate, 'name' | 'description' | 'stages' | 'isDefault' | 'isActive'>>
): Promise<{ template: WorkflowTemplate | null; error: string | null }> {
    const template = workflowTemplateStore.get(templateId);
    if (!template) {
        return { template: null, error: 'Template not found' };
    }

    const updated: WorkflowTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date(),
    };

    workflowTemplateStore.set(templateId, updated);
    return { template: updated, error: null };
}

/**
 * Delete workflow template (soft delete)
 */
export async function deleteWorkflowTemplate(
    templateId: string
): Promise<{ success: boolean; error: string | null }> {
    const template = workflowTemplateStore.get(templateId);
    if (!template) {
        return { success: false, error: 'Template not found' };
    }

    template.isActive = false;
    template.updatedAt = new Date();
    workflowTemplateStore.set(templateId, template);

    return { success: true, error: null };
}

// ============================================================================
// WORKFLOW INSTANCE SERVICE
// ============================================================================

/**
 * Start a workflow for an item
 */
export async function startWorkflow(params: {
    templateId: string;
    tenantId: string;
    targetType: 'design' | 'listing' | 'order' | 'license' | 'content';
    targetId: string;
    startedBy: string;
    metadata?: Record<string, unknown>;
}): Promise<{ instance: WorkflowInstance | null; error: string | null }> {
    const template = workflowTemplateStore.get(params.templateId);
    if (!template) {
        return { instance: null, error: 'Template not found' };
    }

    if (template.stages.length === 0) {
        return { instance: null, error: 'Template has no stages' };
    }

    const now = new Date();
    const firstStage = template.stages[0];

    const instance: WorkflowInstance = {
        id: generateId(),
        templateId: params.templateId,
        tenantId: params.tenantId,
        targetType: params.targetType,
        targetId: params.targetId,
        currentStageId: firstStage.id,
        currentStageIndex: 0,
        status: 'active',
        stageHistory: [
            {
                stageId: firstStage.id,
                stageName: firstStage.name,
                status: 'in_progress',
                enteredAt: now,
                approvals: [],
                comments: [],
            },
        ],
        startedBy: params.startedBy,
        startedAt: now,
        metadata: params.metadata || {},
    };

    workflowInstanceStore.set(instance.id, instance);
    console.log(`[Workflow] Started instance: ${instance.id} for ${params.targetType}/${params.targetId}`);

    return { instance, error: null };
}

/**
 * Get workflow instance
 */
export async function getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return workflowInstanceStore.get(instanceId) || null;
}

/**
 * Get workflow instance for target
 */
export async function getWorkflowForTarget(
    targetType: string,
    targetId: string
): Promise<WorkflowInstance | null> {
    for (const instance of workflowInstanceStore.values()) {
        if (
            instance.targetType === targetType &&
            instance.targetId === targetId &&
            instance.status === 'active'
        ) {
            return instance;
        }
    }
    return null;
}

/**
 * Submit approval for current stage
 */
export async function submitApproval(params: {
    instanceId: string;
    userId: string;
    userName: string;
    action: 'approved' | 'rejected';
    comment?: string;
}): Promise<{ instance: WorkflowInstance | null; error: string | null }> {
    const instance = workflowInstanceStore.get(params.instanceId);
    if (!instance) {
        return { instance: null, error: 'Workflow instance not found' };
    }

    if (instance.status !== 'active') {
        return { instance: null, error: 'Workflow is not active' };
    }

    const template = workflowTemplateStore.get(instance.templateId);
    if (!template) {
        return { instance: null, error: 'Template not found' };
    }

    const currentStage = template.stages[instance.currentStageIndex];
    const currentHistory = instance.stageHistory[instance.stageHistory.length - 1];

    // Add approval record
    const approval: ApprovalRecord = {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        comment: params.comment,
        timestamp: new Date(),
    };
    currentHistory.approvals.push(approval);

    if (params.action === 'rejected') {
        // Stage rejected
        currentHistory.status = 'rejected';
        currentHistory.completedAt = new Date();
        instance.status = 'failed';
        instance.completedAt = new Date();
    } else {
        // Check if we have enough approvals
        const approvalCount = currentHistory.approvals.filter(a => a.action === 'approved').length;
        if (approvalCount >= currentStage.minApprovals) {
            // Stage complete
            currentHistory.status = 'approved';
            currentHistory.completedAt = new Date();

            // Move to next stage or complete workflow
            if (instance.currentStageIndex < template.stages.length - 1) {
                const nextStage = template.stages[instance.currentStageIndex + 1];
                instance.currentStageIndex++;
                instance.currentStageId = nextStage.id;
                instance.stageHistory.push({
                    stageId: nextStage.id,
                    stageName: nextStage.name,
                    status: 'in_progress',
                    enteredAt: new Date(),
                    approvals: [],
                    comments: [],
                });
            } else {
                // Workflow complete
                instance.status = 'completed';
                instance.completedAt = new Date();
            }
        }
    }

    workflowInstanceStore.set(params.instanceId, instance);
    console.log(`[Workflow] ${params.action} by ${params.userName} on instance ${params.instanceId}`);

    return { instance, error: null };
}

/**
 * Add comment to current stage
 */
export async function addWorkflowComment(params: {
    instanceId: string;
    userId: string;
    userName: string;
    content: string;
    attachments?: string[];
}): Promise<{ comment: WorkflowComment | null; error: string | null }> {
    const instance = workflowInstanceStore.get(params.instanceId);
    if (!instance) {
        return { comment: null, error: 'Workflow instance not found' };
    }

    const comment: WorkflowComment = {
        id: generateId(),
        userId: params.userId,
        userName: params.userName,
        content: params.content,
        attachments: params.attachments,
        timestamp: new Date(),
    };

    const currentHistory = instance.stageHistory[instance.stageHistory.length - 1];
    currentHistory.comments.push(comment);
    workflowInstanceStore.set(params.instanceId, instance);

    return { comment, error: null };
}

/**
 * Cancel workflow
 */
export async function cancelWorkflow(
    instanceId: string
): Promise<{ success: boolean; error: string | null }> {
    const instance = workflowInstanceStore.get(instanceId);
    if (!instance) {
        return { success: false, error: 'Workflow instance not found' };
    }

    instance.status = 'canceled';
    instance.completedAt = new Date();
    workflowInstanceStore.set(instanceId, instance);

    return { success: true, error: null };
}

/**
 * List active workflows for tenant
 */
export async function listActiveWorkflows(
    tenantId: string,
    filters?: {
        targetType?: string;
        stageId?: string;
    }
): Promise<WorkflowInstance[]> {
    let instances = Array.from(workflowInstanceStore.values()).filter(
        i => i.tenantId === tenantId && i.status === 'active'
    );

    if (filters?.targetType) {
        instances = instances.filter(i => i.targetType === filters.targetType);
    }
    if (filters?.stageId) {
        instances = instances.filter(i => i.currentStageId === filters.stageId);
    }

    return instances.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Check workflow conditions
 */
export function evaluateConditions(
    conditions: WorkflowCondition[],
    data: Record<string, unknown>
): boolean {
    for (const condition of conditions) {
        const fieldValue = data[condition.field];

        switch (condition.operator) {
            case 'equals':
                if (fieldValue !== condition.value) return false;
                break;
            case 'not_equals':
                if (fieldValue === condition.value) return false;
                break;
            case 'contains':
                if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
                    if (!fieldValue.includes(condition.value)) return false;
                } else if (Array.isArray(fieldValue)) {
                    if (!fieldValue.includes(condition.value)) return false;
                }
                break;
            case 'greater_than':
                if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
                    if (fieldValue <= condition.value) return false;
                }
                break;
            case 'less_than':
                if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
                    if (fieldValue >= condition.value) return false;
                }
                break;
            case 'in':
                if (Array.isArray(condition.value)) {
                    if (!condition.value.includes(fieldValue)) return false;
                }
                break;
            case 'not_in':
                if (Array.isArray(condition.value)) {
                    if (condition.value.includes(fieldValue)) return false;
                }
                break;
        }
    }
    return true;
}

// ============================================================================
// PROJECT SERVICE (KANBAN)
// ============================================================================

/**
 * Create a project
 */
export async function createProject(params: {
    tenantId: string;
    teamId: string;
    name: string;
    description: string;
    type: Project['type'];
    startDate: Date;
    targetDate: Date;
    createdBy: string;
    budget?: ProjectBudget;
}): Promise<{ project: Project | null; error: string | null }> {
    try {
        const now = new Date();

        // Create default Kanban columns
        const columns: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS.map(col => ({
            ...col,
            id: generateId(),
            taskIds: [],
        }));

        const project: Project = {
            id: generateId(),
            tenantId: params.tenantId,
            teamId: params.teamId,
            name: params.name,
            description: params.description,
            status: 'planning',
            type: params.type,
            startDate: params.startDate,
            targetDate: params.targetDate,
            budget: params.budget,
            designIds: [],
            columns,
            members: [
                {
                    userId: params.createdBy,
                    role: 'lead',
                    joinedAt: now,
                },
            ],
            tags: [],
            customFields: {},
            createdBy: params.createdBy,
            createdAt: now,
            updatedAt: now,
        };

        projectStore.set(project.id, project);
        console.log(`[Workflow] Created project: ${project.name} (${project.id})`);

        return { project, error: null };
    } catch (error) {
        return { project: null, error: (error as Error).message };
    }
}

/**
 * Get project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
    return projectStore.get(projectId) || null;
}

/**
 * List projects for team
 */
export async function listProjects(
    teamId: string,
    status?: ProjectStatus
): Promise<Project[]> {
    let projects = Array.from(projectStore.values()).filter(p => p.teamId === teamId);

    if (status) {
        projects = projects.filter(p => p.status === status);
    }

    return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update project
 */
export async function updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'targetDate' | 'budget' | 'tags'>>
): Promise<{ project: Project | null; error: string | null }> {
    const project = projectStore.get(projectId);
    if (!project) {
        return { project: null, error: 'Project not found' };
    }

    const updated: Project = {
        ...project,
        ...updates,
        updatedAt: new Date(),
    };

    if (updates.status === 'completed' && !project.completedDate) {
        updated.completedDate = new Date();
    }

    projectStore.set(projectId, updated);
    return { project: updated, error: null };
}

/**
 * Add member to project
 */
export async function addProjectMember(
    projectId: string,
    userId: string,
    role: 'lead' | 'member' | 'viewer'
): Promise<{ success: boolean; error: string | null }> {
    const project = projectStore.get(projectId);
    if (!project) {
        return { success: false, error: 'Project not found' };
    }

    if (project.members.some(m => m.userId === userId)) {
        return { success: false, error: 'User already a member' };
    }

    project.members.push({
        userId,
        role,
        joinedAt: new Date(),
    });
    project.updatedAt = new Date();
    projectStore.set(projectId, project);

    return { success: true, error: null };
}

/**
 * Remove member from project
 */
export async function removeProjectMember(
    projectId: string,
    userId: string
): Promise<{ success: boolean; error: string | null }> {
    const project = projectStore.get(projectId);
    if (!project) {
        return { success: false, error: 'Project not found' };
    }

    const memberIndex = project.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
        return { success: false, error: 'User not a member' };
    }

    project.members.splice(memberIndex, 1);
    project.updatedAt = new Date();
    projectStore.set(projectId, project);

    return { success: true, error: null };
}

/**
 * Add/update Kanban column
 */
export async function updateKanbanColumn(
    projectId: string,
    column: Partial<KanbanColumn> & { id?: string }
): Promise<{ column: KanbanColumn | null; error: string | null }> {
    const project = projectStore.get(projectId);
    if (!project) {
        return { column: null, error: 'Project not found' };
    }

    if (column.id) {
        // Update existing
        const index = project.columns.findIndex(c => c.id === column.id);
        if (index === -1) {
            return { column: null, error: 'Column not found' };
        }
        project.columns[index] = { ...project.columns[index], ...column };
        project.updatedAt = new Date();
        projectStore.set(projectId, project);
        return { column: project.columns[index], error: null };
    } else {
        // Create new
        const newColumn: KanbanColumn = {
            id: generateId(),
            name: column.name || 'New Column',
            order: project.columns.length + 1,
            color: column.color || '#6b7280',
            wipLimit: column.wipLimit,
            taskIds: [],
        };
        project.columns.push(newColumn);
        project.updatedAt = new Date();
        projectStore.set(projectId, project);
        return { column: newColumn, error: null };
    }
}

/**
 * Delete Kanban column
 */
export async function deleteKanbanColumn(
    projectId: string,
    columnId: string
): Promise<{ success: boolean; error: string | null }> {
    const project = projectStore.get(projectId);
    if (!project) {
        return { success: false, error: 'Project not found' };
    }

    const columnIndex = project.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) {
        return { success: false, error: 'Column not found' };
    }

    const column = project.columns[columnIndex];
    if (column.taskIds.length > 0) {
        return { success: false, error: 'Column has tasks - move or delete them first' };
    }

    project.columns.splice(columnIndex, 1);
    project.updatedAt = new Date();
    projectStore.set(projectId, project);

    return { success: true, error: null };
}

// ============================================================================
// TASK SERVICE
// ============================================================================

/**
 * Create a task
 */
export async function createTask(params: {
    projectId: string;
    columnId: string;
    title: string;
    description: string;
    priority?: TaskPriority;
    assigneeIds?: string[];
    dueDate?: Date;
    labels?: string[];
    createdBy: string;
}): Promise<{ task: Task | null; error: string | null }> {
    const project = projectStore.get(params.projectId);
    if (!project) {
        return { task: null, error: 'Project not found' };
    }

    const column = project.columns.find(c => c.id === params.columnId);
    if (!column) {
        return { task: null, error: 'Column not found' };
    }

    // Check WIP limit
    if (column.wipLimit && column.taskIds.length >= column.wipLimit) {
        return { task: null, error: `Column WIP limit (${column.wipLimit}) reached` };
    }

    const now = new Date();
    const task: Task = {
        id: generateId(),
        projectId: params.projectId,
        columnId: params.columnId,
        title: params.title,
        description: params.description,
        status: 'todo',
        priority: params.priority || 'medium',
        assigneeIds: params.assigneeIds || [],
        dueDate: params.dueDate,
        checklist: [],
        attachments: [],
        labels: params.labels || [],
        order: column.taskIds.length,
        dependencies: [],
        comments: [],
        createdBy: params.createdBy,
        createdAt: now,
        updatedAt: now,
    };

    taskStore.set(task.id, task);
    column.taskIds.push(task.id);
    project.updatedAt = now;
    projectStore.set(params.projectId, project);

    console.log(`[Workflow] Created task: ${task.title} (${task.id})`);
    return { task, error: null };
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
    return taskStore.get(taskId) || null;
}

/**
 * Update task
 */
export async function updateTask(
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assigneeIds' | 'dueDate' | 'labels'>>
): Promise<{ task: Task | null; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { task: null, error: 'Task not found' };
    }

    const updated: Task = {
        ...task,
        ...updates,
        updatedAt: new Date(),
    };

    taskStore.set(taskId, updated);
    return { task: updated, error: null };
}

/**
 * Move task to different column
 */
export async function moveTask(
    taskId: string,
    targetColumnId: string,
    targetIndex?: number
): Promise<{ success: boolean; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    const project = projectStore.get(task.projectId);
    if (!project) {
        return { success: false, error: 'Project not found' };
    }

    const sourceColumn = project.columns.find(c => c.id === task.columnId);
    const targetColumn = project.columns.find(c => c.id === targetColumnId);

    if (!sourceColumn || !targetColumn) {
        return { success: false, error: 'Column not found' };
    }

    // Check WIP limit on target
    if (
        task.columnId !== targetColumnId &&
        targetColumn.wipLimit &&
        targetColumn.taskIds.length >= targetColumn.wipLimit
    ) {
        return { success: false, error: `Target column WIP limit (${targetColumn.wipLimit}) reached` };
    }

    // Remove from source
    const sourceIndex = sourceColumn.taskIds.indexOf(taskId);
    if (sourceIndex > -1) {
        sourceColumn.taskIds.splice(sourceIndex, 1);
    }

    // Add to target
    const insertIndex = targetIndex ?? targetColumn.taskIds.length;
    targetColumn.taskIds.splice(insertIndex, 0, taskId);

    // Update task
    task.columnId = targetColumnId;
    task.order = insertIndex;
    task.updatedAt = new Date();

    // Map column to status
    const statusMap: Record<string, TaskStatus> = {
        'Backlog': 'backlog',
        'To Do': 'todo',
        'In Progress': 'in_progress',
        'Review': 'review',
        'Done': 'done',
    };
    if (statusMap[targetColumn.name]) {
        task.status = statusMap[targetColumn.name];
    }

    taskStore.set(taskId, task);
    project.updatedAt = new Date();
    projectStore.set(task.projectId, project);

    return { success: true, error: null };
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string): Promise<{ success: boolean; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    const project = projectStore.get(task.projectId);
    if (project) {
        const column = project.columns.find(c => c.id === task.columnId);
        if (column) {
            const index = column.taskIds.indexOf(taskId);
            if (index > -1) {
                column.taskIds.splice(index, 1);
            }
        }
        project.updatedAt = new Date();
        projectStore.set(task.projectId, project);
    }

    taskStore.delete(taskId);
    return { success: true, error: null };
}

/**
 * Add checklist item to task
 */
export async function addChecklistItem(
    taskId: string,
    text: string
): Promise<{ item: ChecklistItem | null; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { item: null, error: 'Task not found' };
    }

    const item: ChecklistItem = {
        id: generateId(),
        text,
        completed: false,
    };

    task.checklist.push(item);
    task.updatedAt = new Date();
    taskStore.set(taskId, task);

    return { item, error: null };
}

/**
 * Toggle checklist item
 */
export async function toggleChecklistItem(
    taskId: string,
    itemId: string,
    completedBy?: string
): Promise<{ success: boolean; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    const item = task.checklist.find(i => i.id === itemId);
    if (!item) {
        return { success: false, error: 'Checklist item not found' };
    }

    item.completed = !item.completed;
    if (item.completed) {
        item.completedBy = completedBy;
        item.completedAt = new Date();
    } else {
        item.completedBy = undefined;
        item.completedAt = undefined;
    }

    task.updatedAt = new Date();
    taskStore.set(taskId, task);

    return { success: true, error: null };
}

/**
 * Add time entry to task
 */
export async function addTimeEntry(
    taskId: string,
    entry: Omit<TimeEntry, 'id'>
): Promise<{ entry: TimeEntry | null; error: string | null }> {
    const task = taskStore.get(taskId);
    if (!task) {
        return { entry: null, error: 'Task not found' };
    }

    if (!task.timeTracking) {
        task.timeTracking = {
            estimated: 0,
            logged: 0,
            entries: [],
        };
    }

    const newEntry: TimeEntry = {
        ...entry,
        id: generateId(),
    };

    task.timeTracking.entries.push(newEntry);
    task.timeTracking.logged += entry.duration;
    task.updatedAt = new Date();
    taskStore.set(taskId, task);

    return { entry: newEntry, error: null };
}

/**
 * Add comment to task
 */
export async function addTaskComment(params: {
    taskId: string;
    userId: string;
    userName: string;
    content: string;
    mentions?: string[];
}): Promise<{ comment: TaskComment | null; error: string | null }> {
    const task = taskStore.get(params.taskId);
    if (!task) {
        return { comment: null, error: 'Task not found' };
    }

    const comment: TaskComment = {
        id: generateId(),
        userId: params.userId,
        userName: params.userName,
        content: params.content,
        mentions: params.mentions || [],
        timestamp: new Date(),
    };

    task.comments.push(comment);
    task.updatedAt = new Date();
    taskStore.set(params.taskId, task);

    return { comment, error: null };
}

// ============================================================================
// ORGANIZATION HIERARCHY SERVICE
// ============================================================================

/**
 * Create organization unit
 */
export async function createOrgUnit(params: {
    tenantId: string;
    parentId: string | null;
    type: OrgUnitType;
    name: string;
    description?: string;
    code?: string;
    managerId?: string;
}): Promise<{ unit: OrganizationUnit | null; error: string | null }> {
    const now = new Date();

    const unit: OrganizationUnit = {
        id: generateId(),
        tenantId: params.tenantId,
        parentId: params.parentId,
        type: params.type,
        name: params.name,
        description: params.description,
        code: params.code,
        managerId: params.managerId,
        memberIds: [],
        settings: {
            allowSubUnits: true,
            inheritPermissions: true,
            permissions: [],
        },
        metadata: {},
        createdAt: now,
        updatedAt: now,
    };

    orgUnitStore.set(unit.id, unit);
    console.log(`[Workflow] Created org unit: ${unit.name} (${unit.type})`);

    return { unit, error: null };
}

/**
 * Get organization unit
 */
export async function getOrgUnit(unitId: string): Promise<OrganizationUnit | null> {
    return orgUnitStore.get(unitId) || null;
}

/**
 * Get organization hierarchy (tree structure)
 */
export async function getOrgHierarchy(tenantId: string): Promise<OrganizationUnit[]> {
    const units = Array.from(orgUnitStore.values()).filter(u => u.tenantId === tenantId);

    // Build tree (flatten for now, could be nested)
    return units.sort((a, b) => {
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Get children of organization unit
 */
export async function getOrgUnitChildren(parentId: string): Promise<OrganizationUnit[]> {
    return Array.from(orgUnitStore.values()).filter(u => u.parentId === parentId);
}

/**
 * Add member to organization unit
 */
export async function addOrgUnitMember(
    unitId: string,
    userId: string
): Promise<{ success: boolean; error: string | null }> {
    const unit = orgUnitStore.get(unitId);
    if (!unit) {
        return { success: false, error: 'Organization unit not found' };
    }

    if (unit.memberIds.includes(userId)) {
        return { success: false, error: 'User already a member' };
    }

    unit.memberIds.push(userId);
    unit.updatedAt = new Date();
    orgUnitStore.set(unitId, unit);

    return { success: true, error: null };
}

/**
 * Remove member from organization unit
 */
export async function removeOrgUnitMember(
    unitId: string,
    userId: string
): Promise<{ success: boolean; error: string | null }> {
    const unit = orgUnitStore.get(unitId);
    if (!unit) {
        return { success: false, error: 'Organization unit not found' };
    }

    const index = unit.memberIds.indexOf(userId);
    if (index === -1) {
        return { success: false, error: 'User not a member' };
    }

    unit.memberIds.splice(index, 1);
    unit.updatedAt = new Date();
    orgUnitStore.set(unitId, unit);

    return { success: true, error: null };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const WorkflowService = {
    // Templates
    createWorkflowTemplate,
    getWorkflowTemplate,
    listWorkflowTemplates,
    getDefaultTemplate,
    updateWorkflowTemplate,
    deleteWorkflowTemplate,

    // Instances
    startWorkflow,
    getWorkflowInstance,
    getWorkflowForTarget,
    submitApproval,
    addWorkflowComment,
    cancelWorkflow,
    listActiveWorkflows,
    evaluateConditions,

    // Projects
    createProject,
    getProject,
    listProjects,
    updateProject,
    addProjectMember,
    removeProjectMember,
    updateKanbanColumn,
    deleteKanbanColumn,

    // Tasks
    createTask,
    getTask,
    updateTask,
    moveTask,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    addTimeEntry,
    addTaskComment,

    // Organization
    createOrgUnit,
    getOrgUnit,
    getOrgHierarchy,
    getOrgUnitChildren,
    addOrgUnitMember,
    removeOrgUnitMember,

    // Constants
    DEFAULT_DESIGN_APPROVAL_STAGES,
    DEFAULT_KANBAN_COLUMNS,
};

export default WorkflowService;
