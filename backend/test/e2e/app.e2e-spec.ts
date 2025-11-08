/**
 * End-to-End tests for Gloria Backend
 * Tests complete user workflows and system integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/core/database/prisma.service';
import { ClerkAuthService } from '@/core/auth/services/clerk-auth.service';
import { CacheService } from '@/core/cache/cache.service';
// import { NotificationsService } from '@/modules/notifications/services/notifications.service';
// import { WorkflowsService } from '@/modules/workflows/services/workflows.service';
import {
  cleanDatabase,
  TestDataFactory,
  createTestPrismaClient,
  wait,
  measurePerformance,
} from '../setup';

describe('Gloria Backend E2E Tests', () => {
  let app: NestFastifyApplication;
  let prismaService: PrismaService;
  let clerkAuthService: ClerkAuthService;
  let cacheService: CacheService;
  // let notificationService: NotificationsService;
  // let workflowsService: WorkflowsService;

  // Test users
  let adminUser: any;
  let managerUser: any;
  let employeeUser: any;

  // Test data
  let testSchool: any;
  let testDepartment: any;
  let testPosition: any;
  let testRole: any;
  let testPermission: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createTestPrismaClient())
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Initialize app
    app.setGlobalPrefix('api/v1');
    app.enableCors();

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Get services
    prismaService = app.get<PrismaService>(PrismaService);
    clerkAuthService = app.get<ClerkAuthService>(ClerkAuthService);
    cacheService = app.get<CacheService>(CacheService);
    // notificationService = app.get<NotificationsService>(NotificationsService);
    // workflowsService = app.get<WorkflowsService>(WorkflowsService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanDatabase(prismaService);
    await app.close();
  });

  async function setupTestData() {
    // Clean database first
    await cleanDatabase(prismaService);

    // Create test school
    testSchool = await prismaService.school.create({
      data: {
        id: 'school-1',
        code: 'SCH001',
        name: 'Test School',
        lokasi: 'Test Location',
        address: '123 Test Street',
        phone: '+1234567890',
        email: 'school@test.com',
        updatedAt: new Date(),
      },
    });

    // Create test department
    testDepartment = await prismaService.department.create({
      data: {
        id: 'dept-1',
        code: 'DEPT001',
        name: 'IT Department',
        schoolId: testSchool.id,
        updatedAt: new Date(),
      },
    });

    // Create test position
    testPosition = await prismaService.position.create({
      data: {
        id: 'pos-1',
        code: 'POS001',
        name: 'IT Manager',
        departmentId: testDepartment.id,
        hierarchyLevel: 2,
        updatedAt: new Date(),
      },
    });

    // Create test permission
    testPermission = await prismaService.permission.create({
      data: {
        id: 'perm-1',
        code: 'MANAGE_USERS',
        name: 'Manage Users',
        description: 'Can manage user accounts',
        resource: 'USERS',
        action: 'CREATE',
        scope: 'DEPARTMENT',
        updatedAt: new Date(),
      },
    });

    // Create test role
    testRole = await prismaService.role.create({
      data: {
        id: 'role-1',
        code: 'MANAGER',
        name: 'Manager',
        description: 'Department manager role',
        hierarchyLevel: 2,
        updatedAt: new Date(),
      },
    });

    // Assign permission to role
    await prismaService.rolePermission.create({
      data: {
        id: 'role-perm-1',
        roleId: testRole.id,
        permissionId: testPermission.id,
        updatedAt: new Date(),
      },
    });

    // Create test users
    adminUser = await prismaService.userProfile.create({
      data: {
        id: 'user-admin',
        clerkUserId: 'clerk_admin',
        nip: '100001',
        updatedAt: new Date(),
      },
    });

    managerUser = await prismaService.userProfile.create({
      data: {
        id: 'user-manager',
        clerkUserId: 'clerk_manager',
        nip: '100002',
        updatedAt: new Date(),
      },
    });

    employeeUser = await prismaService.userProfile.create({
      data: {
        id: 'user-employee',
        clerkUserId: 'clerk_employee',
        nip: '100003',
        updatedAt: new Date(),
      },
    });

    // Assign roles and positions
    await prismaService.userRole.create({
      data: {
        id: 'user-role-1',
        userProfileId: managerUser.id,
        roleId: testRole.id,
      },
    });

    await prismaService.userPosition.create({
      data: {
        id: 'user-pos-1',
        userProfileId: managerUser.id,
        positionId: testPosition.id,
        startDate: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mock Clerk authentication
    jest
      .spyOn(clerkAuthService, 'validateToken' as any)
      .mockImplementation(async (token: string) => {
        if (token === 'admin_token') return { id: adminUser.clerkUserId };
        if (token === 'manager_token') return { id: managerUser.clerkUserId };
        if (token === 'employee_token') return { id: employeeUser.clerkUserId };
        throw new Error('Invalid token');
      });
  }

  describe('Complete User Onboarding Flow', () => {
    it('should onboard a new employee successfully', async () => {
      const newEmployeeData = {
        clerkUserId: 'clerk_new_employee',
        email: 'newemployee@test.com',
        firstName: 'New',
        lastName: 'Employee',
        nip: '100004',
      };

      // Step 1: Admin creates new user
      const createUserResponse = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: newEmployeeData,
      });

      expect(createUserResponse.statusCode).toBe(201);
      const newUser = JSON.parse(createUserResponse.body);

      // Step 2: Assign to school
      const assignSchoolResponse = await app.inject({
        method: 'POST',
        url: `/users/${newUser.id}/schools`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: {
          schoolId: testSchool.id,
        },
      });

      expect(assignSchoolResponse.statusCode).toBe(200);

      // Step 3: Assign to department
      const assignDeptResponse = await app.inject({
        method: 'POST',
        url: `/users/${newUser.id}/departments`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: {
          departmentId: testDepartment.id,
        },
      });

      expect(assignDeptResponse.statusCode).toBe(200);

      // Step 4: Create position for new employee
      const newPosition = await prismaService.position.create({
        data: {
          id: 'pos-2',
          code: 'POS002',
          name: 'Junior Developer',
          departmentId: testDepartment.id,
          hierarchyLevel: 3,
          updatedAt: new Date(),
        },
      });

      // Step 5: Assign position
      const assignPositionResponse = await app.inject({
        method: 'POST',
        url: `/organizations/positions/${newPosition.id}/assign-user`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: {
          userId: newUser.id,
        },
      });

      expect(assignPositionResponse.statusCode).toBe(200);

      // Step 6: Verify complete user profile
      const profileResponse = await app.inject({
        method: 'GET',
        url: `/users/${newUser.id}`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
      });

      expect(profileResponse.statusCode).toBe(200);
      const profile = JSON.parse(profileResponse.body);
      expect(profile.schools).toHaveLength(1);
      expect(profile.departments).toHaveLength(1);
      expect(profile.positions).toHaveLength(1);
    });
  });

  // TODO: Implement workflow tests when WorkflowDefinition model is added
  describe.skip('Workflow Approval Process', () => {
    it('should execute leave request workflow', async () => {
      // Step 1: Create leave request workflow definition
      // Note: Current Workflow model is for instances, not definitions
      // const workflowDef = await prismaService.workflow.create({
      //   data: {
      //     id: 'workflow-1',
      //     code: 'LEAVE_REQUEST',
      //     name: 'Leave Request',
      //     description: 'Employee leave request approval',
      //     module: 'LEAVE',
      //     category: 'EMPLOYEE',
      //     steps: {
      //       steps: [
      //         {
      //           id: 'submit',
      //           type: 'ACTION',
      //           name: 'Submit Request',
      //           config: { action: 'CREATE_REQUEST' },
      //         },
      //         {
      //           id: 'manager_approval',
      //           type: 'APPROVAL',
      //           name: 'Manager Approval',
      //           config: {
      //             approvers: [managerUser.id],
      //             strategy: 'ANY',
      //           },
      //         },
      //         {
      //           id: 'notification',
      //           type: 'NOTIFICATION',
      //           name: 'Notify HR',
      //           config: {
      //             template: 'leave_approved',
      //             recipients: ['hr@test.com'],
      //           },
      //         },
      //       ],
      //     },
      //     createdBy: adminUser.id,
      //   },
      // });

      // Step 2: Employee initiates workflow
      const initiateResponse = await app.inject({
        method: 'POST',
        url: `/workflows/workflow-1/execute`,
        headers: {
          Authorization: 'Bearer employee_token',
        },
        payload: {
          data: {
            type: 'ANNUAL_LEAVE',
            startDate: '2024-06-01',
            endDate: '2024-06-05',
            reason: 'Family vacation',
          },
        },
      });

      expect(initiateResponse.statusCode).toBe(201);
      const instance = JSON.parse(initiateResponse.body);

      // Step 3: Manager approves request
      const approveResponse = await app.inject({
        method: 'POST',
        url: `/workflows/instances/${instance.id}/approve`,
        headers: {
          Authorization: 'Bearer manager_token',
        },
        payload: {
          stepId: 'manager_approval',
          decision: 'APPROVED',
          comments: 'Approved for family vacation',
        },
      });

      expect(approveResponse.statusCode).toBe(200);

      // Step 4: Verify workflow completion
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/workflows/instances/${instance.id}`,
        headers: {
          Authorization: 'Bearer employee_token',
        },
      });

      expect(statusResponse.statusCode).toBe(200);
      const status = JSON.parse(statusResponse.body);
      expect(status.status).toBe('COMPLETED');
      expect(status.currentStep).toBe('notification');
    });
  });

  describe('Permission Hierarchy', () => {
    it('should enforce permission hierarchy correctly', async () => {
      // Setup: Create hierarchical departments
      const subDepartment = await prismaService.department.create({
        data: {
          id: 'dept-2',
          code: 'DEPT002',
          name: 'Sub Department',
          schoolId: testSchool.id,
          updatedAt: new Date(),
        },
      });

      const subEmployee = await prismaService.userProfile.create({
        data: {
          id: 'user-sub',
          clerkUserId: 'clerk_sub_employee',
          nip: '100005',
          updatedAt: new Date(),
        },
      });

      // Associate user with department via position
      const subPosition = await prismaService.position.create({
        data: {
          id: 'pos-3',
          code: 'POS003',
          name: 'Staff',
          departmentId: subDepartment.id,
          hierarchyLevel: 4,
          updatedAt: new Date(),
        },
      });

      await prismaService.userPosition.create({
        data: {
          id: 'user-pos-2',
          userProfileId: subEmployee.id,
          positionId: subPosition.id,
          startDate: new Date(),
          updatedAt: new Date(),
        },
      });

      // Test 1: Manager can manage users in own department
      const manageOwnDeptResponse = await app.inject({
        method: 'PATCH',
        url: `/users/${employeeUser.id}`,
        headers: {
          Authorization: 'Bearer manager_token',
        },
        payload: {
          phoneNumber: '+9876543210',
        },
      });

      expect(manageOwnDeptResponse.statusCode).toBe(200);

      // Test 2: Manager can manage users in sub-department (DEPARTMENT scope)
      const manageSubDeptResponse = await app.inject({
        method: 'PATCH',
        url: `/users/${subEmployee.id}`,
        headers: {
          Authorization: 'Bearer manager_token',
        },
        payload: {
          phoneNumber: '+9876543211',
        },
      });

      expect(manageSubDeptResponse.statusCode).toBe(200);

      // Test 3: Employee cannot manage other users
      const employeeManageResponse = await app.inject({
        method: 'PATCH',
        url: `/users/${managerUser.id}`,
        headers: {
          Authorization: 'Bearer employee_token',
        },
        payload: {
          phoneNumber: '+9876543212',
        },
      });

      expect(employeeManageResponse.statusCode).toBe(403);
    });
  });

  describe('Notification System', () => {
    it('should deliver notifications through multiple channels', async () => {
      // Step 1: Set user notification preferences
      const preferencesResponse = await app.inject({
        method: 'PUT',
        url: `/notifications/preferences`,
        headers: {
          Authorization: 'Bearer employee_token',
        },
        payload: {
          channels: {
            email: true,
            inApp: true,
            push: false,
            sms: false,
          },
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            timezone: 'Asia/Jakarta',
          },
        },
      });

      expect(preferencesResponse.statusCode).toBe(200);

      // Step 2: Send notification
      const sendResponse = await app.inject({
        method: 'POST',
        url: '/notifications/send',
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: {
          userId: employeeUser.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'System Maintenance',
          message: 'The system will be under maintenance tonight',
          priority: 'HIGH',
        },
      });

      expect(sendResponse.statusCode).toBe(201);
      const notification = JSON.parse(sendResponse.body);

      // Step 3: Verify in-app notification
      const inAppResponse = await app.inject({
        method: 'GET',
        url: '/notifications/inbox',
        headers: {
          Authorization: 'Bearer employee_token',
        },
      });

      expect(inAppResponse.statusCode).toBe(200);
      const inbox = JSON.parse(inAppResponse.body);
      expect(inbox.data).toHaveLength(1);
      expect(inbox.data[0].title).toBe('System Maintenance');

      // Step 4: Mark as read
      const markReadResponse = await app.inject({
        method: 'PATCH',
        url: `/notifications/${notification.id}/read`,
        headers: {
          Authorization: 'Bearer employee_token',
        },
      });

      expect(markReadResponse.statusCode).toBe(200);
    });
  });

  describe('Audit Trail', () => {
    it('should track all sensitive operations', async () => {
      // Perform sensitive operations
      const operations = [
        // Create user
        {
          method: 'POST',
          url: '/users',
          payload: {
            clerkUserId: 'clerk_audit_test',
            email: 'audit@test.com',
            firstName: 'Audit',
            lastName: 'Test',
            nip: '100006',
          },
        },
        // Assign role
        {
          method: 'POST',
          url: '/roles/assign',
          payload: {
            userId: managerUser.id,
            roleId: testRole.id,
          },
        },
        // Grant permission
        {
          method: 'POST',
          url: '/permissions/bulk-assign',
          payload: {
            userId: managerUser.id,
            permissionIds: [testPermission.id],
          },
        },
      ];

      for (const op of operations) {
        await app.inject({
          method: op.method as any,
          url: op.url,
          payload: op.payload,
          headers: {
            Authorization: 'Bearer admin_token',
          },
        });
      }

      // Query audit logs
      const auditResponse = await app.inject({
        method: 'GET',
        url: '/audit/logs',
        headers: {
          Authorization: 'Bearer admin_token',
        },
        query: {
          userId: adminUser.id,
          limit: '10',
        },
      });

      expect(auditResponse.statusCode).toBe(200);
      const auditLogs = JSON.parse(auditResponse.body);
      expect(auditLogs.data.length).toBeGreaterThan(0);

      // Verify audit log details
      const createUserLog = auditLogs.data.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'USER',
      );
      expect(createUserLog).toBeDefined();
      expect(createUserLog.userId).toBe(adminUser.id);
      expect(createUserLog.metadata).toHaveProperty('email', 'audit@test.com');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent user requests efficiently', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        app.inject({
          method: 'GET',
          url: `/users`,
          headers: {
            Authorization: 'Bearer admin_token',
          },
          query: {
            page: '1',
            limit: '10',
          },
        }),
      );

      const { result, duration } = await measurePerformance(
        () => Promise.all(requests),
        'Concurrent user requests',
      );

      const responses = result as any[];
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should handle 50 requests within 5s
    });

    it('should cache permissions effectively', async () => {
      // First request - cache miss
      const { duration: firstDuration } = await measurePerformance(
        () =>
          app.inject({
            method: 'POST',
            url: '/permissions/check',
            headers: {
              Authorization: 'Bearer manager_token',
            },
            payload: {
              permission: 'MANAGE_USERS',
              scope: 'DEPARTMENT',
            },
          }),
        'First permission check',
      );

      // Second request - cache hit
      const { duration: secondDuration } = await measurePerformance(
        () =>
          app.inject({
            method: 'POST',
            url: '/permissions/check',
            headers: {
              Authorization: 'Bearer manager_token',
            },
            payload: {
              permission: 'MANAGE_USERS',
              scope: 'DEPARTMENT',
            },
          }),
        'Cached permission check',
      );

      // Cached request should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration / 2);
    });
  });

  describe('Error Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error
      jest
        .spyOn(prismaService.userProfile, 'findMany')
        .mockRejectedValueOnce(new Error('Database connection lost'));

      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          Authorization: 'Bearer admin_token',
        },
      });

      expect(response.statusCode).toBe(500);
      const error = JSON.parse(response.body);
      expect(error.message).toContain('Internal server error');
    });

    it('should handle cache failures gracefully', async () => {
      // Simulate cache error
      jest
        .spyOn(cacheService, 'get')
        .mockRejectedValueOnce(new Error('Redis connection failed'));

      // Should fallback to database
      const response = await app.inject({
        method: 'GET',
        url: `/users/${employeeUser.id}`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across transactions', async () => {
      const newRoleData = {
        code: 'TEMP_ROLE',
        name: 'Temporary Role',
        level: 3,
      };

      // Create role and assign permissions in transaction
      const createRoleResponse = await app.inject({
        method: 'POST',
        url: '/roles',
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: newRoleData,
      });

      expect(createRoleResponse.statusCode).toBe(201);
      const newRole = JSON.parse(createRoleResponse.body);

      // Simulate error in permission assignment
      jest
        .spyOn(prismaService.rolePermission, 'create')
        .mockRejectedValueOnce(new Error('Constraint violation'));

      const assignPermResponse = await app.inject({
        method: 'POST',
        url: `/roles/${newRole.id}/permissions`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
        payload: {
          permissionId: 'invalid-permission-id',
        },
      });

      expect(assignPermResponse.statusCode).toBe(400);

      // Verify role still exists and is usable
      const getRoleResponse = await app.inject({
        method: 'GET',
        url: `/roles/${newRole.id}`,
        headers: {
          Authorization: 'Bearer admin_token',
        },
      });

      expect(getRoleResponse.statusCode).toBe(200);
    });
  });
});
