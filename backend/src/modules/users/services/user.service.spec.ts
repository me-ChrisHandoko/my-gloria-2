// Mock uuid module - must be before any imports
jest.mock('uuid', () => {
  return {
    v7: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  InvalidUserDataException,
  UserNotActiveException,
} from '../exceptions/user.exception';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from '../dto';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;

  const mockUserRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByClerkId: jest.fn(),
    findByNip: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    hardDelete: jest.fn(),
    updateLastActive: jest.fn(),
    existsByClerkId: jest.fn(),
    existsByNip: jest.fn(),
    countActiveUsers: jest.fn(),
    findUsersWithRoles: jest.fn(),
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    clerkUserId: 'user_2abc123def456',
    nip: '123456789012345',
    isActive: true,
    lastActive: null,
    preferences: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: null,
    dataKaryawan: {
      nip: '123456789012345',
      nama: 'John Doe',
      email: 'john.doe@example.com',
    },
    roles: [],
    positions: [],
  };

  const mockPrismaService = {
    dataKaryawan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      clerkUserId: 'user_2abc123def456',
      nip: '123456789012345',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a new user successfully', async () => {
      // UUID v7 is already mocked at the module level

      mockUserRepository.existsByClerkId.mockResolvedValue(false);
      mockUserRepository.existsByNip.mockResolvedValue(false);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockUserRepository.existsByClerkId).toHaveBeenCalledWith(
        createUserDto.clerkUserId,
      );
      expect(mockUserRepository.existsByNip).toHaveBeenCalledWith(
        createUserDto.nip,
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createUserDto,
        }),
      );
      expect(result).toBeDefined();
      expect(result.clerkUserId).toBe(createUserDto.clerkUserId);
    });

    it('should throw UserAlreadyExistsException if clerkUserId exists', async () => {
      mockUserRepository.existsByClerkId.mockResolvedValue(true);
      mockUserRepository.existsByNip.mockResolvedValue(false);

      await expect(service.create(createUserDto)).rejects.toThrow(
        UserAlreadyExistsException,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw UserAlreadyExistsException if NIP exists', async () => {
      mockUserRepository.existsByClerkId.mockResolvedValue(false);
      mockUserRepository.existsByNip.mockResolvedValue(true);

      await expect(service.create(createUserDto)).rejects.toThrow(
        UserAlreadyExistsException,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw InvalidUserDataException on repository error', async () => {
      mockUserRepository.existsByClerkId.mockResolvedValue(false);
      mockUserRepository.existsByNip.mockResolvedValue(false);
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createUserDto)).rejects.toThrow(
        InvalidUserDataException,
      );
    });
  });

  describe('findAll', () => {
    const queryDto: QueryUserDto = {
      page: 1,
      limit: 20,
      search: 'John',
      isActive: true,
    };

    it('should return paginated users', async () => {
      const mockPaginatedResult = {
        data: [mockUser],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockUserRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(queryDto);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        queryDto.page,
        queryDto.limit,
        expect.objectContaining({
          search: queryDto.search,
          isActive: queryDto.isActive,
        }),
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });

    it('should handle empty results', async () => {
      const mockEmptyResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockUserRepository.findAll.mockResolvedValue(mockEmptyResult);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('findByClerkId', () => {
    it('should return a user by Clerk ID and update last active', async () => {
      mockUserRepository.findByClerkId.mockResolvedValue(mockUser);
      mockUserRepository.updateLastActive.mockResolvedValue(undefined);

      const result = await service.findByClerkId(mockUser.clerkUserId);

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith(
        mockUser.clerkUserId,
      );
      expect(mockUserRepository.updateLastActive).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toBeDefined();
      expect(result.clerkUserId).toBe(mockUser.clerkUserId);
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockUserRepository.findByClerkId.mockResolvedValue(null);

      await expect(
        service.findByClerkId('non-existent-clerk-id'),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      email: 'updated@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        updateUserDto,
      );
      expect(result).toBeDefined();
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateUserDto),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw UserNotActiveException if user is not active', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(service.update(mockUser.id, updateUserDto)).rejects.toThrow(
        UserNotActiveException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      const deletedUser = { ...mockUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.softDelete.mockResolvedValue(deletedUser);

      const result = await service.remove(mockUser.id);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBeDefined();
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const restoredUser = { ...mockUser, isActive: true };

      mockUserRepository.findById.mockResolvedValue(inactiveUser);
      mockUserRepository.update.mockResolvedValue(restoredUser);

      const result = await service.restore(mockUser.id);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        isActive: true,
      });
      expect(result).toBeDefined();
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.restore('non-existent-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getActiveUsersCount', () => {
    it('should return the count of active users', async () => {
      mockUserRepository.countActiveUsers.mockResolvedValue(42);

      const result = await service.getActiveUsersCount();

      expect(mockUserRepository.countActiveUsers).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });

  describe('getUsersWithRoles', () => {
    it('should return users with specified roles', async () => {
      const roleIds = ['role-1', 'role-2'];
      mockUserRepository.findUsersWithRoles.mockResolvedValue([mockUser]);

      const result = await service.getUsersWithRoles(roleIds);

      expect(mockUserRepository.findUsersWithRoles).toHaveBeenCalledWith(
        roleIds,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('syncWithClerk - With DataKaryawan Validation', () => {
    const clerkUserData = {
      id: 'user_2abc123def456',
      emailAddresses: [{ emailAddress: 'john.doe@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
      publicMetadata: { nip: '123456789012345' },
    };

    const mockDataKaryawan = {
      nip: '123456789012345',
      email: 'john.doe@example.com',
      statusAktif: 'Aktif',
      nama: 'John Doe',
    };

    it('should create a new user when DataKaryawan exists and is active', async () => {
      // Setup: No existing user profile
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.existsByClerkId.mockResolvedValue(false);
      mockUserRepository.existsByNip.mockResolvedValue(false);
      mockUserRepository.create.mockResolvedValue(mockUser);

      // Setup: DataKaryawan exists and is active
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );

      const result = await service.syncWithClerk(
        clerkUserData.id,
        clerkUserData,
      );

      // Verify DataKaryawan validation was performed
      expect(mockPrismaService.dataKaryawan.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: clerkUserData.emailAddresses[0].emailAddress,
            mode: 'insensitive',
          },
          statusAktif: 'Aktif',
        },
      });

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith(
        clerkUserData.id,
      );
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException when DataKaryawan does not exist', async () => {
      // Setup: No existing user profile
      mockUserRepository.findByClerkId.mockResolvedValue(null);

      // Setup: DataKaryawan doesn't exist
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(null);

      await expect(
        service.syncWithClerk(clerkUserData.id, clerkUserData),
      ).rejects.toThrow(UnauthorizedException);

      // Verify security audit log was created
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            module: 'USER_SYNC',
            metadata: expect.objectContaining({
              securityAction: 'SYNC_UNAUTHORIZED',
              reason: 'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
            }),
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when DataKaryawan is inactive', async () => {
      // Setup: No existing user profile
      mockUserRepository.findByClerkId.mockResolvedValue(null);

      // Setup: DataKaryawan exists but is inactive
      const inactiveDataKaryawan = {
        ...mockDataKaryawan,
        statusAktif: 'Tidak Aktif',
      };
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        inactiveDataKaryawan,
      );

      await expect(
        service.syncWithClerk(clerkUserData.id, clerkUserData),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update existing user when DataKaryawan is still active', async () => {
      // Setup: Existing user profile
      mockUserRepository.findByClerkId.mockResolvedValue(mockUser);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(mockUser);

      // Setup: DataKaryawan exists and is active
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        mockDataKaryawan,
      );

      const result = await service.syncWithClerk(
        clerkUserData.id,
        clerkUserData,
      );

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith(
        clerkUserData.id,
      );
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should deactivate user profile when employee becomes inactive', async () => {
      // Setup: Existing user profile
      mockUserRepository.findByClerkId.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Setup: DataKaryawan became inactive
      const inactiveDataKaryawan = {
        ...mockDataKaryawan,
        statusAktif: 'Tidak Aktif',
      };
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        inactiveDataKaryawan,
      );

      await expect(
        service.syncWithClerk(clerkUserData.id, clerkUserData),
      ).rejects.toThrow(UnauthorizedException);

      // Verify user was deactivated
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        isActive: false,
      });
    });

    it('should handle case-insensitive email matching', async () => {
      // Test with uppercase email
      const upperCaseClerkData = {
        ...clerkUserData,
        emailAddresses: [{ emailAddress: 'JOHN.DOE@EXAMPLE.COM' }],
      };

      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );
      mockUserRepository.existsByClerkId.mockResolvedValue(false);
      mockUserRepository.existsByNip.mockResolvedValue(false);
      mockUserRepository.create.mockResolvedValue(mockUser);

      await service.syncWithClerk(upperCaseClerkData.id, upperCaseClerkData);

      // Should use case-insensitive search
      expect(mockPrismaService.dataKaryawan.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: 'JOHN.DOE@EXAMPLE.COM',
            mode: 'insensitive',
          },
          statusAktif: 'Aktif',
        },
      });
    });
  });
});
