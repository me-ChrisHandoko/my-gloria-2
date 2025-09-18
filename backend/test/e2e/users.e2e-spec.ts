import { createE2ETestSuite } from './test-e2e-setup';
import { testFixtures } from '../fixtures/test-data';
import { HttpStatus } from '@nestjs/common';

/**
 * E2E tests for Users module
 */
createE2ETestSuite('Users E2E', ({ app, prisma, testSetup }) => {
  describe('/api/v1/users', () => {
    beforeEach(async () => {
      // Seed test data before each test
      await testSetup.seedDatabase(async (prisma) => {
        // Create test schools
        await prisma.school.create({
          data: testFixtures.schools.main,
        });

        // Create test departments
        await prisma.department.create({
          data: testFixtures.departments.academic,
        });

        // Create DataKaryawan (employee master data)
        await prisma.dataKaryawan.createMany({
          data: [
            testFixtures.dataKaryawan.admin,
            testFixtures.dataKaryawan.teacher,
            testFixtures.dataKaryawan.student,
          ],
        });

        // Create test roles
        await prisma.role.createMany({
          data: [
            testFixtures.roles.admin,
            testFixtures.roles.teacher,
            testFixtures.roles.student,
          ],
        });

        // Create test users
        await prisma.userProfile.createMany({
          data: [
            testFixtures.users.admin,
            testFixtures.users.teacher,
            testFixtures.users.student,
          ],
        });
      });
    });

    describe('GET /users', () => {
      it('should return paginated users list', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          '/api/v1/users',
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination).toMatchObject({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        });
      });

      it('should filter users by active status', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          '/api/v1/users',
          {
            query: { isActive: true },
          },
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.data).toBeDefined();
        response.body.data.forEach((user: any) => {
          expect(user.isActive).toBe(true);
        });
      });

      it('should search users by name or email', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          '/api/v1/users',
          {
            query: { search: 'admin' },
          },
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should handle pagination parameters', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          '/api/v1/users',
          {
            query: { page: 2, limit: 1 },
          },
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(1);
      });

      it('should return 401 for unauthenticated requests', async () => {
        const response = await testSetup.makeRequest('GET', '/api/v1/users');
        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('GET /users/:id', () => {
      it('should return a specific user by ID', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          `/api/v1/users/${testFixtures.users.admin.id}`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.id).toBe(testFixtures.users.admin.id);
        expect(response.body.nip).toBe(testFixtures.users.admin.nip);
      });

      it('should return 404 for non-existent user', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          '/api/v1/users/non-existent-id',
        );

        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      });

      it('should include related data when requested', async () => {
        // First create user-role relationship
        await prisma.userRole.create({
          data: {
            id: 'user-role-1',
            userProfileId: testFixtures.users.admin.id,
            roleId: testFixtures.roles.admin.id,
          },
        });

        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          `/api/v1/users/${testFixtures.users.admin.id}?include=roles`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.roles).toBeDefined();
        expect(Array.isArray(response.body.roles)).toBe(true);
      });
    });

    describe('POST /users', () => {
      it('should create a new user', async () => {
        // First create DataKaryawan for the new user
        await prisma.dataKaryawan.create({
          data: {
            nip: 'NIP999999',
            nama: 'New User',
            email: 'newuser@example.com',
            noPonsel: '+628123456799',
            jenisKelamin: 'L',
            status: 'AKTIF',
            statusAktif: 'AKTIF',
            lokasi: 'SCH001',
            bagianKerja: 'Administration',
            bidangKerja: 'School Administration',
            jenisKaryawan: 'TETAP',
          },
        });

        const newUser = {
          clerkUserId: 'clerk_new_user',
          nip: 'NIP999999',
        };

        const response = await testSetup.makeAuthenticatedRequest(
          'POST',
          '/api/v1/users',
          { body: newUser },
        );

        expect(response.statusCode).toBe(HttpStatus.CREATED);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('nip');
        expect(response.body.clerkUserId).toBe(newUser.clerkUserId);

        // Cleanup
        await prisma.userProfile.delete({
          where: { id: response.body.id },
        });
      });

      it('should validate required fields', async () => {
        const invalidUser = {
          // Missing required fields
        };

        const response = await testSetup.makeAuthenticatedRequest(
          'POST',
          '/api/v1/users',
          { body: invalidUser },
        );

        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should prevent duplicate clerkUserId', async () => {
        const duplicateUser = {
          clerkUserId: testFixtures.users.admin.clerkUserId,
          nip: 'NIP999998',
        };

        const response = await testSetup.makeAuthenticatedRequest(
          'POST',
          '/api/v1/users',
          { body: duplicateUser },
        );

        expect(response.statusCode).toBe(HttpStatus.CONFLICT);
      });
    });

    describe('PATCH /users/:id', () => {
      it('should update user details', async () => {
        const updateData = {
          isActive: false,
          preferences: { theme: 'dark' },
        };

        const response = await testSetup.makeAuthenticatedRequest(
          'PATCH',
          `/api/v1/users/${testFixtures.users.teacher.id}`,
          { body: updateData },
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.body.isActive).toBe(updateData.isActive);

        // Verify in database
        const updatedUser = await prisma.userProfile.findUnique({
          where: { id: testFixtures.users.teacher.id },
        });
        expect(updatedUser?.isActive).toBe(updateData.isActive);
      });

      it('should return 404 for non-existent user', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'PATCH',
          '/api/v1/users/non-existent-id',
          { body: { isActive: false } },
        );

        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      });
    });

    describe('DELETE /users/:id', () => {
      it('should soft delete a user', async () => {
        // Create a user to delete
        await prisma.dataKaryawan.create({
          data: {
            nip: 'NIP777777',
            nama: 'To Delete',
            email: 'delete@example.com',
            jenisKelamin: 'L',
            status: 'AKTIF',
          },
        });

        const userToDelete = await prisma.userProfile.create({
          data: {
            id: 'user-to-delete',
            clerkUserId: 'clerk_delete',
            nip: 'NIP777777',
            isActive: true,
          },
        });

        const response = await testSetup.makeAuthenticatedRequest(
          'DELETE',
          `/api/v1/users/${userToDelete.id}`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);

        // Check that user is soft deleted (isActive = false)
        const deletedUser = await prisma.userProfile.findUnique({
          where: { id: userToDelete.id },
        });
        expect(deletedUser?.isActive).toBe(false);
      });

      it('should return 404 for non-existent user', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'DELETE',
          '/api/v1/users/non-existent-id',
        );

        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      });
    });

    describe('User Permissions', () => {
      it('should check user permissions correctly', async () => {
        // Create permission
        const permission = await prisma.permission.create({
          data: {
            id: 'perm-test',
            code: 'TEST_RESOURCE_READ',
            name: 'Read Test Resource',
            resource: 'test_resource',
            action: 'READ',
            scope: 'ALL',
            description: 'Test permission',
          },
        });

        // Create user permission
        await prisma.userPermission.create({
          data: {
            id: 'user-perm-1',
            userProfileId: testFixtures.users.admin.id,
            permissionId: permission.id,
            isGranted: true,
            grantedBy: 'system',
            grantReason: 'E2E Test',
          },
        });

        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          `/api/v1/users/${testFixtures.users.admin.id}/permissions`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('User Roles', () => {
      it('should assign role to user', async () => {
        const response = await testSetup.makeAuthenticatedRequest(
          'POST',
          `/api/v1/users/${testFixtures.users.teacher.id}/roles`,
          {
            body: {
              roleId: testFixtures.roles.admin.id,
            },
          },
        );

        expect(response.statusCode).toBe(HttpStatus.CREATED);

        // Verify in database
        const userRole = await prisma.userRole.findFirst({
          where: {
            userProfileId: testFixtures.users.teacher.id,
            roleId: testFixtures.roles.admin.id,
          },
        });
        expect(userRole).toBeDefined();
      });

      it('should remove role from user', async () => {
        // First assign role
        await prisma.userRole.create({
          data: {
            id: 'user-role-to-remove',
            userProfileId: testFixtures.users.teacher.id,
            roleId: testFixtures.roles.teacher.id,
          },
        });

        const response = await testSetup.makeAuthenticatedRequest(
          'DELETE',
          `/api/v1/users/${testFixtures.users.teacher.id}/roles/${testFixtures.roles.teacher.id}`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);

        // Verify removal
        const userRole = await prisma.userRole.findFirst({
          where: {
            userProfileId: testFixtures.users.teacher.id,
            roleId: testFixtures.roles.teacher.id,
          },
        });
        expect(userRole).toBeNull();
      });

      it('should list user roles', async () => {
        // Create user role
        await prisma.userRole.create({
          data: {
            id: 'user-role-list',
            userProfileId: testFixtures.users.teacher.id,
            roleId: testFixtures.roles.teacher.id,
          },
        });

        const response = await testSetup.makeAuthenticatedRequest(
          'GET',
          `/api/v1/users/${testFixtures.users.teacher.id}/roles`,
        );

        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });
  });
});
