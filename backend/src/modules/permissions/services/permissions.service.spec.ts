/**
 * Unit tests for PermissionsService
 * Tests core permission management functionality
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permission.service';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PermissionAction, PermissionScope } from '@prisma/client';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prismaService: PrismaService;
  let loggingService: LoggingService;

  const mockPrismaService = {
    permission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    permissionGroup: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    permissionDependency: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockLoggingService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockPermission = {
    id: 'test-permission-id',
    code: 'TEST_PERMISSION',
    name: 'Test Permission',
    description: 'Test permission description',
    resource: 'test-resource',
    action: PermissionAction.READ,
    scope: PermissionScope.OWN,
    groupId: 'test-group-id',
    isActive: true,
    isSystemPermission: false,
    conditions: undefined,
    metadata: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    group: null as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggingService = module.get<LoggingService>(LoggingService);

    jest.clearAllMocks();
  });

  describe('createPermission', () => {
    const createPermissionDto = {
      code: 'TEST_CREATE_PERMISSION',
      name: 'Test Create Permission',
      description: 'Permission for testing create',
      resource: 'test-resource',
      action: PermissionAction.CREATE,
      scope: PermissionScope.OWN,
      groupId: 'test-group-id',
      conditions: undefined,
      metadata: undefined,
      isSystemPermission: false,
    };

    it('should create a new permission successfully', async () => {
      const newPermission = { ...mockPermission, ...createPermissionDto };
      mockPrismaService.permission.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.create.mockResolvedValue(newPermission);

      const result = await service.createPermission(
        createPermissionDto,
        'test-user-id',
      );

      expect(result).toEqual(newPermission);
      expect(mockPrismaService.permission.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if permission code already exists', async () => {
      mockPrismaService.permission.findFirst.mockResolvedValue(mockPermission);

      await expect(
        service.createPermission(createPermissionDto, 'test-user-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.permission.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createPermission(createPermissionDto, 'test-user-id'),
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find permission by id', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findById('test-permission-id');

      expect(result).toEqual(mockPermission);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-permission-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should find permission by code', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findByCode('TEST_PERMISSION');

      expect(result).toEqual(mockPermission);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { code: 'TEST_PERMISSION' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if permission code not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NON_EXISTENT_CODE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePermission', () => {
    const updatePermissionDto = {
      name: 'Updated Permission Name',
      description: 'Updated description',
      isActive: true,
    };

    it('should update permission successfully', async () => {
      const existingPermission = { ...mockPermission };
      const updatedPermission = {
        ...existingPermission,
        ...updatePermissionDto,
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(
        existingPermission,
      );
      mockPrismaService.permission.update.mockResolvedValue(updatedPermission);

      const result = await service.updatePermission(
        'test-permission-id',
        updatePermissionDto,
        'test-user-id',
      );

      expect(result).toEqual(updatedPermission);
      expect(mockPrismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 'test-permission-id' },
        data: expect.objectContaining({
          name: updatePermissionDto.name,
          description: updatePermissionDto.description,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePermission(
          'non-existent',
          updatePermissionDto,
          'test-user-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow updating system permissions', async () => {
      const systemPermission = { ...mockPermission, isSystemPermission: true };
      mockPrismaService.permission.findUnique.mockResolvedValue(
        systemPermission,
      );

      await expect(
        service.updatePermission(
          'test-id',
          updatePermissionDto,
          'test-user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePermission', () => {
    it('should soft delete permission successfully', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permissionDependency.count.mockResolvedValue(0);
      mockPrismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        isActive: false,
      });

      await service.deletePermission('test-permission-id', 'test-user-id');

      expect(mockPrismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 'test-permission-id' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePermission('non-existent', 'test-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow deleting system permissions', async () => {
      const systemPermission = { ...mockPermission, isSystemPermission: true };
      mockPrismaService.permission.findUnique.mockResolvedValue(
        systemPermission,
      );

      await expect(
        service.deletePermission('test-permission-id', 'test-user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow deleting permissions with dependencies', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permissionDependency.count.mockResolvedValue(3);

      await expect(
        service.deletePermission('test-permission-id', 'test-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMany', () => {
    it('should return filtered permissions', async () => {
      const permissions = [mockPermission];
      mockPrismaService.permission.findMany.mockResolvedValue(permissions);

      const result = await service.findMany({
        resource: 'test-resource',
        action: PermissionAction.READ,
      });

      expect(result).toEqual(permissions);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          resource: 'test-resource',
          action: PermissionAction.READ,
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should return all permissions when no filter provided', async () => {
      const permissions = [mockPermission];
      mockPrismaService.permission.findMany.mockResolvedValue(permissions);

      const result = await service.findMany();

      expect(result).toEqual(permissions);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalled();
    });
  });

  describe('Permission Groups', () => {
    const mockPermissionGroup = {
      id: 'test-group-id',
      code: 'TEST_GROUP',
      name: 'Test Group',
      description: 'Test group description',
      category: 'SYSTEM' as any,
      icon: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
    };

    describe('createPermissionGroup', () => {
      const createGroupDto = {
        code: 'NEW_GROUP',
        name: 'New Group',
        description: 'New group description',
        category: 'SYSTEM' as any,
        icon: undefined,
        sortOrder: 1,
      };

      it('should create permission group successfully', async () => {
        mockPrismaService.permissionGroup.findUnique.mockResolvedValue(null);
        mockPrismaService.permissionGroup.create.mockResolvedValue({
          ...mockPermissionGroup,
          ...createGroupDto,
        });

        const result = await service.createPermissionGroup(
          createGroupDto,
          'test-user-id',
        );

        expect(result).toBeDefined();
        expect(mockPrismaService.permissionGroup.create).toHaveBeenCalled();
      });

      it('should throw ConflictException if group code exists', async () => {
        mockPrismaService.permissionGroup.findUnique.mockResolvedValue(
          mockPermissionGroup,
        );

        await expect(
          service.createPermissionGroup(createGroupDto, 'test-user-id'),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('updatePermissionGroup', () => {
      const updateGroupDto = {
        name: 'Updated Group Name',
        description: 'Updated description',
        isActive: true,
      };

      it('should update permission group successfully', async () => {
        mockPrismaService.permissionGroup.findUnique.mockResolvedValue(
          mockPermissionGroup,
        );
        mockPrismaService.permissionGroup.update.mockResolvedValue({
          ...mockPermissionGroup,
          ...updateGroupDto,
        });

        const result = await service.updatePermissionGroup(
          'test-group-id',
          updateGroupDto,
          'test-user-id',
        );

        expect(result).toBeDefined();
        expect(mockPrismaService.permissionGroup.update).toHaveBeenCalled();
      });

      it('should throw NotFoundException if group not found', async () => {
        mockPrismaService.permissionGroup.findUnique.mockResolvedValue(null);

        await expect(
          service.updatePermissionGroup(
            'non-existent',
            updateGroupDto,
            'test-user-id',
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findAllGroups', () => {
      it('should return all active permission groups', async () => {
        const groups = [mockPermissionGroup];
        mockPrismaService.permissionGroup.findMany.mockResolvedValue(groups);

        const result = await service.findAllGroups();

        expect(result).toEqual(groups);
        expect(mockPrismaService.permissionGroup.findMany).toHaveBeenCalledWith(
          {
            where: { isActive: true },
            include: expect.any(Object),
            orderBy: expect.any(Array),
          },
        );
      });

      it('should include inactive groups when requested', async () => {
        const groups = [mockPermissionGroup];
        mockPrismaService.permissionGroup.findMany.mockResolvedValue(groups);

        const result = await service.findAllGroups(true);

        expect(result).toEqual(groups);
        expect(mockPrismaService.permissionGroup.findMany).toHaveBeenCalledWith(
          {
            where: {},
            include: expect.any(Object),
            orderBy: expect.any(Array),
          },
        );
      });
    });
  });

  describe('getStatistics', () => {
    it('should return permission statistics', async () => {
      mockPrismaService.permission.count.mockResolvedValueOnce(100); // total
      mockPrismaService.permission.count.mockResolvedValueOnce(90); // active
      mockPrismaService.permission.count.mockResolvedValueOnce(20); // system
      mockPrismaService.permissionGroup.count.mockResolvedValue(10); // groups
      mockPrismaService.permission.groupBy.mockResolvedValueOnce([
        { action: PermissionAction.READ, _count: 30 },
        { action: PermissionAction.UPDATE, _count: 25 },
      ]);
      mockPrismaService.permission.groupBy.mockResolvedValueOnce([
        { scope: PermissionScope.OWN, _count: 20 },
        { scope: PermissionScope.ALL, _count: 15 },
      ]);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalPermissions: 100,
        activePermissions: 90,
        systemPermissions: 20,
        totalGroups: 10,
        permissionsByAction: [
          { action: PermissionAction.READ, count: 30 },
          { action: PermissionAction.UPDATE, count: 25 },
        ],
        permissionsByScope: [
          { scope: PermissionScope.OWN, count: 20 },
          { scope: PermissionScope.ALL, count: 15 },
        ],
      });
    });
  });

  describe('Permission Dependencies', () => {
    describe('addDependency', () => {
      it('should add permission dependency successfully', async () => {
        mockPrismaService.permissionDependency.findMany.mockResolvedValue([]);
        mockPrismaService.permissionDependency.create.mockResolvedValue({
          id: 'dep-id',
          permissionId: 'perm1',
          dependsOnId: 'perm2',
          isRequired: true,
          createdAt: new Date(),
        });

        await service.addDependency('perm1', 'perm2', true);

        expect(
          mockPrismaService.permissionDependency.create,
        ).toHaveBeenCalledWith({
          data: expect.objectContaining({
            permissionId: 'perm1',
            dependsOnId: 'perm2',
            isRequired: true,
          }),
        });
      });

      it('should prevent circular dependencies', async () => {
        mockPrismaService.permissionDependency.findMany.mockResolvedValueOnce([
          {
            id: 'dep1',
            permissionId: 'perm2',
            dependsOnId: 'perm1',
            isRequired: true,
            createdAt: new Date(),
          },
        ]);

        await expect(service.addDependency('perm1', 'perm2')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should prevent self-dependency', async () => {
        await expect(service.addDependency('perm1', 'perm1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });
});
