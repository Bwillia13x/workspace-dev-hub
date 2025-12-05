/**
 * Enterprise Workflow Tests - Phase 6 Enterprise & Scale
 */

import { describe, it, expect } from 'vitest';

import {
    WorkflowService,
    createWorkflowTemplate,
    getWorkflowTemplate,
    listWorkflowTemplates,
    startWorkflow,
    getWorkflowInstance,
    createProject,
    getProject,
    createTask,
    getTask,
    createOrgUnit,
    getOrgUnit,
    DEFAULT_DESIGN_APPROVAL_STAGES,
    DEFAULT_KANBAN_COLUMNS,
} from '../../enterprise';

// ============================================================================
// WORKFLOW MANAGEMENT TESTS
// ============================================================================

describe('Enterprise: Workflow Management', () => {
    describe('Workflow Templates', () => {
        it('should create a workflow template', async () => {
            const result = await createWorkflowTemplate({
                tenantId: 'tenant-123',
                name: 'Design Review',
                description: 'Standard design review workflow',
                type: 'design_approval',
                stages: DEFAULT_DESIGN_APPROVAL_STAGES,
                createdBy: 'admin-user',
            });

            expect(result.error).toBeNull();
            expect(result.template).toBeDefined();
            expect(result.template?.name).toBe('Design Review');
            expect(result.template?.stages.length).toBeGreaterThan(0);
        });

        it('should get workflow template by ID', async () => {
            const createResult = await createWorkflowTemplate({
                tenantId: 'tenant-lookup',
                name: 'Publication Flow',
                description: 'Marketplace publication workflow',
                type: 'publication',
                stages: DEFAULT_DESIGN_APPROVAL_STAGES,
                createdBy: 'admin-user',
            });

            const template = await getWorkflowTemplate(createResult.template!.id);
            expect(template).toBeDefined();
            expect(template?.name).toBe('Publication Flow');
        });

        it('should list workflow templates for tenant', async () => {
            const tenantId = `tenant-list-${Date.now()}`;

            await createWorkflowTemplate({
                tenantId,
                name: 'Template 1',
                description: 'First template',
                type: 'design_approval',
                stages: DEFAULT_DESIGN_APPROVAL_STAGES,
                createdBy: 'admin-user',
            });

            const templates = await listWorkflowTemplates(tenantId);
            expect(templates.length).toBeGreaterThanOrEqual(1);
        });

        it('should have default design approval stages', () => {
            expect(DEFAULT_DESIGN_APPROVAL_STAGES.length).toBeGreaterThan(0);
            expect(DEFAULT_DESIGN_APPROVAL_STAGES[0]).toHaveProperty('name');
            expect(DEFAULT_DESIGN_APPROVAL_STAGES[0]).toHaveProperty('order');
        });
    });

    describe('Workflow Instances', () => {
        it('should start a new workflow instance', async () => {
            const templateResult = await createWorkflowTemplate({
                tenantId: 'workflow-instance-tenant',
                name: 'Instance Test Workflow',
                description: 'For testing workflow instances',
                type: 'design_approval',
                stages: DEFAULT_DESIGN_APPROVAL_STAGES,
                createdBy: 'admin-user',
            });

            const result = await startWorkflow({
                templateId: templateResult.template!.id,
                tenantId: 'workflow-instance-tenant',
                targetType: 'design',
                targetId: 'design-123',
                startedBy: 'user-456',
            });

            expect(result.error).toBeNull();
            expect(result.instance).toBeDefined();
            expect(result.instance?.status).toBe('active');
        });

        it('should get workflow instance by ID', async () => {
            const templateResult = await createWorkflowTemplate({
                tenantId: 'workflow-get-tenant',
                name: 'Get Instance Test',
                description: 'For getting workflow instances',
                type: 'design_approval',
                stages: DEFAULT_DESIGN_APPROVAL_STAGES,
                createdBy: 'admin-user',
            });

            const startResult = await startWorkflow({
                templateId: templateResult.template!.id,
                tenantId: 'workflow-get-tenant',
                targetType: 'design',
                targetId: 'design-789',
                startedBy: 'user-101',
            });

            const instance = await getWorkflowInstance(startResult.instance!.id);
            expect(instance).toBeDefined();
            expect(instance?.targetId).toBe('design-789');
        });
    });

    describe('Project Management (Kanban)', () => {
        it('should create a project with default columns', async () => {
            const result = await createProject({
                tenantId: 'kanban-tenant',
                teamId: 'team-123',
                name: 'Spring Collection',
                description: 'Spring 2025 fashion collection',
                type: 'collection',
                startDate: new Date(),
                targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                createdBy: 'owner-kanban',
            });

            expect(result.error).toBeNull();
            expect(result.project).toBeDefined();
            expect(result.project?.name).toBe('Spring Collection');
            expect(result.project?.columns.length).toBe(DEFAULT_KANBAN_COLUMNS.length);
        });

        it('should get project by ID', async () => {
            const createResult = await createProject({
                tenantId: 'project-lookup',
                teamId: 'team-456',
                name: 'Lookup Project',
                description: 'Test project lookup',
                type: 'internal',
                startDate: new Date(),
                targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: 'owner-lookup',
            });

            const project = await getProject(createResult.project!.id);
            expect(project).toBeDefined();
            expect(project?.name).toBe('Lookup Project');
        });

        it('should have default Kanban columns', () => {
            expect(DEFAULT_KANBAN_COLUMNS.length).toBeGreaterThan(0);
            expect(DEFAULT_KANBAN_COLUMNS.find(c => c.name === 'Backlog')).toBeDefined();
            expect(DEFAULT_KANBAN_COLUMNS.find(c => c.name === 'Done')).toBeDefined();
        });
    });

    describe('Task Management', () => {
        it('should create a task', async () => {
            const projectResult = await createProject({
                tenantId: 'task-tenant',
                teamId: 'team-task',
                name: 'Task Test Project',
                description: 'For testing tasks',
                type: 'internal',
                startDate: new Date(),
                targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: 'owner-task',
            });

            // Use actual column ID from created project
            const backlogColumn = projectResult.project!.columns.find(c => c.name === 'Backlog');

            const result = await createTask({
                projectId: projectResult.project!.id,
                columnId: backlogColumn!.id,
                title: 'Design summer dress',
                description: 'Create a lightweight summer dress design',
                priority: 'high',
                createdBy: 'creator-123',
            });

            expect(result.error).toBeNull();
            expect(result.task).toBeDefined();
            expect(result.task?.title).toBe('Design summer dress');
        });

        it('should get task by ID', async () => {
            const projectResult = await createProject({
                tenantId: 'task-lookup-tenant',
                teamId: 'team-task-lookup',
                name: 'Lookup Task Project',
                description: 'For task lookup',
                type: 'internal',
                startDate: new Date(),
                targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: 'owner-task-lookup',
            });

            // Use actual column ID from created project
            const backlogColumn = projectResult.project!.columns.find(c => c.name === 'Backlog');

            const createResult = await createTask({
                projectId: projectResult.project!.id,
                columnId: backlogColumn!.id,
                title: 'Lookup Task',
                description: 'Test task for lookup',
                priority: 'medium',
                createdBy: 'creator-lookup',
            });

            const task = await getTask(createResult.task!.id);
            expect(task).toBeDefined();
            expect(task?.title).toBe('Lookup Task');
        });
    });

    describe('Organization Hierarchy', () => {
        it('should create an organization unit', async () => {
            const result = await createOrgUnit({
                tenantId: 'org-tenant',
                parentId: 'root',
                name: 'Design Department',
                type: 'department',
            });

            expect(result.error).toBeNull();
            expect(result.unit).toBeDefined();
            expect(result.unit?.name).toBe('Design Department');
        });

        it('should get organization unit by ID', async () => {
            const createResult = await createOrgUnit({
                tenantId: 'org-lookup',
                parentId: 'root',
                name: 'Marketing Team',
                type: 'team',
            });

            const unit = await getOrgUnit(createResult.unit!.id);
            expect(unit).toBeDefined();
            expect(unit?.name).toBe('Marketing Team');
        });
    });

    describe('WorkflowService namespace', () => {
        it('should export all functions', () => {
            expect(WorkflowService.createWorkflowTemplate).toBeDefined();
            expect(WorkflowService.startWorkflow).toBeDefined();
            expect(WorkflowService.submitApproval).toBeDefined();
            expect(WorkflowService.createProject).toBeDefined();
            expect(WorkflowService.createTask).toBeDefined();
            expect(WorkflowService.createOrgUnit).toBeDefined();
        });
    });
});
