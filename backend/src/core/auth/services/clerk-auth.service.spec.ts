import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthService } from './clerk-auth.service';
import { PrismaService } from '../../database/prisma.service';
import { SecurityMonitorService } from '../../monitoring/security-monitor.service';

// Mock Clerk backend
jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
    emailAddresses: {
      createEmailAddress: jest.fn(),
      deleteEmailAddress: jest.fn(),
    },
  })),
}));

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: jest.fn(() => 'mocked-uuid'),
} as any;

describe('ClerkAuthService - DataKaryawan Validation', () => {
  let service: ClerkAuthService;
  let prismaService: PrismaService;
  let securityMonitor: SecurityMonitorService;
  let configService: ConfigService;

  const mockPrismaService = {
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dataKaryawan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    userPermission: {
      findMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
  };

  const mockSecurityMonitor = {
    trackFailedLogin: jest.fn(),
    trackUnauthorizedAccess: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        CLERK_SECRET_KEY: 'test_secret_key',
        CLERK_AUTO_SYNC_EMAIL: true,
        CLERK_SYNC_MAX_RETRIES: 3,
        CLERK_SYNC_RETRY_DELAY: 1000,
        CLERK_SYNC_TIMEOUT: 5000,
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SecurityMonitorService,
          useValue: mockSecurityMonitor,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ClerkAuthService>(ClerkAuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    securityMonitor = module.get<SecurityMonitorService>(
      SecurityMonitorService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('syncUserProfile - DataKaryawan Validation', () => {
    const mockClerkUser = {
      id: 'clerk_user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      profileImageUrl: null,
      banned: false,
      publicMetadata: {},
      privateMetadata: {},
    };

    const mockDataKaryawan = {
      nip: '123456789012345',
      email: 'test@example.com',
      statusAktif: 'Aktif',
    };

    it('should create user profile when DataKaryawan exists with Aktif status', async () => {
      // User profile doesn't exist yet
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      // DataKaryawan exists and is active
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );

      // Mock successful profile creation
      const createdProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.create.mockResolvedValue(createdProfile);

      const result = await service.syncUserProfile(mockClerkUser);

      expect(result).toEqual(createdProfile);
      expect(mockPrismaService.dataKaryawan.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: mockClerkUser.email,
            mode: 'insensitive',
          },
          statusAktif: 'Aktif',
        },
      });
      expect(mockPrismaService.userProfile.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when DataKaryawan does not exist', async () => {
      // User profile doesn't exist
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      // DataKaryawan doesn't exist
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(null);

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockSecurityMonitor.trackFailedLogin).toHaveBeenCalledWith(
        mockClerkUser.email,
        'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
      );
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when DataKaryawan exists but is inactive', async () => {
      // User profile doesn't exist
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      // DataKaryawan exists but is inactive
      const inactiveDataKaryawan = {
        ...mockDataKaryawan,
        statusAktif: 'Tidak Aktif',
      };
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        inactiveDataKaryawan,
      );

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockSecurityMonitor.trackFailedLogin).toHaveBeenCalledWith(
        mockClerkUser.email,
        'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
      );
    });

    it('should deactivate existing user profile when employee becomes inactive', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan exists but became inactive
      const inactiveDataKaryawan = {
        ...mockDataKaryawan,
        statusAktif: 'Tidak Aktif',
      };
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        inactiveDataKaryawan,
      );

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify profile was deactivated
      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: existingProfile.id },
        data: { isActive: false },
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should update existing user profile when employee is still active', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan exists and is still active with matching email
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue({
        ...mockDataKaryawan,
        nama: 'Test User',
      });

      const result = await service.syncUserProfile(mockClerkUser);

      // Should update last active
      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: existingProfile.id },
        data: {
          lastActive: expect.any(Date),
          isActive: true,
        },
      });
    });

    it('should throw UnauthorizedException when email does not match for existing profile', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan exists with different email
      const dataKaryawanWithDifferentEmail = {
        ...mockDataKaryawan,
        email: 'different@example.com',
        nama: 'Test User',
      };
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        dataKaryawanWithDifferentEmail,
      );

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify security tracking was called
      expect(mockSecurityMonitor.trackFailedLogin).toHaveBeenCalledWith(
        mockClerkUser.email,
        'EMAIL_MISMATCH',
      );

      // Verify audit log was created
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'EMAIL_MISMATCH',
            expectedEmail: 'different@example.com',
            email: mockClerkUser.email,
          }),
        }),
      });
    });

    it('should throw UnauthorizedException when DataKaryawan email is missing', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan exists but has no email
      const dataKaryawanNoEmail = {
        nip: mockDataKaryawan.nip,
        email: null,
        statusAktif: 'Aktif',
        nama: 'Test User',
      };
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        dataKaryawanNoEmail,
      );

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify audit log was created
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'DATA_KARYAWAN_EMAIL_MISSING',
          }),
        }),
      });
    });

    it('should throw UnauthorizedException when Clerk user has no email', async () => {
      // Clerk user without email
      const clerkUserNoEmail = {
        ...mockClerkUser,
        email: null,
      };

      await expect(service.syncUserProfile(clerkUserNoEmail)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle email comparison case-insensitively for existing profiles', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: mockDataKaryawan.nip,
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan with different case email
      const dataKaryawanUpperCase = {
        ...mockDataKaryawan,
        email: 'TEST@EXAMPLE.COM', // uppercase
        nama: 'Test User',
      };
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(
        dataKaryawanUpperCase,
      );

      // Mock clerkUser with lowercase email
      const clerkUserLowerCase = {
        ...mockClerkUser,
        email: 'test@example.com', // lowercase
      };

      const result = await service.syncUserProfile(clerkUserLowerCase);

      // Should succeed despite case difference
      expect(result).toBeDefined();
      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: existingProfile.id },
        data: {
          lastActive: expect.any(Date),
          isActive: true,
        },
      });
    });

    it('should throw UnauthorizedException when DataKaryawan record not found for existing profile', async () => {
      // User profile exists
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: mockClerkUser.id,
        nip: '999999999999999', // NIP that doesn't exist
        isActive: true,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      // DataKaryawan doesn't exist for this NIP
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(null);

      await expect(service.syncUserProfile(mockClerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify profile was deactivated
      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: existingProfile.id },
        data: { isActive: false },
      });

      // Verify audit log was created
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'DATA_KARYAWAN_NOT_FOUND',
          }),
        }),
      });
    });

    it('should handle case-insensitive email matching', async () => {
      // Test with different email cases
      const clerkUserUpperCase = {
        ...mockClerkUser,
        email: 'TEST@EXAMPLE.COM',
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile_123',
        clerkUserId: clerkUserUpperCase.id,
        nip: mockDataKaryawan.nip,
      });

      await service.syncUserProfile(clerkUserUpperCase);

      // Should use case-insensitive search
      expect(mockPrismaService.dataKaryawan.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: 'TEST@EXAMPLE.COM',
            mode: 'insensitive',
          },
          statusAktif: 'Aktif',
        },
      });
    });
  });

  describe('loadUserProfile - Integration with syncUserProfile', () => {
    it('should propagate UnauthorizedException from syncUserProfile', async () => {
      const mockClerkClient = (service as any).clerkClient;
      mockClerkClient.users.getUser = jest.fn().mockResolvedValue({
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'unauthorized@example.com' }],
        firstName: 'Unauthorized',
        lastName: 'User',
      });

      // DataKaryawan doesn't exist
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.loadUserProfile('clerk_123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user profile when validation passes', async () => {
      const mockClerkClient = (service as any).clerkClient;
      mockClerkClient.users.getUser = jest.fn().mockResolvedValue({
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'valid@example.com' }],
        firstName: 'Valid',
        lastName: 'User',
      });

      const mockDataKaryawan = {
        nip: '123456789012345',
        email: 'valid@example.com',
        statusAktif: 'Aktif',
      };

      const mockProfile = {
        id: 'profile_123',
        clerkUserId: 'clerk_123',
        nip: mockDataKaryawan.nip,
        isActive: true,
      };

      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(
        mockDataKaryawan,
      );
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockResolvedValue(mockProfile);

      const result = await service.loadUserProfile('clerk_123');

      expect(result).toEqual(mockProfile);
    });
  });

  describe('Email Sync Functionality', () => {
    let mockClerkClient: any;

    beforeEach(() => {
      mockClerkClient = (service as any).clerkClient;
      jest.clearAllMocks();
    });

    it('should successfully sync email when mismatch detected for existing user', async () => {
      // Setup existing user with email mismatch
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: 'clerk_123',
        nip: '123456789012345',
        isActive: true,
      };

      const clerkUser = {
        id: 'clerk_123',
        email: 'old@example.com', // Old email in Clerk
      };

      const dataKaryawan = {
        nip: '123456789012345',
        email: 'new@example.com', // New email in DataKaryawan
        statusAktif: 'Aktif',
        nama: 'Test User',
      };

      // Mock responses
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(dataKaryawan);
      mockClerkClient.emailAddresses.createEmailAddress.mockResolvedValue({
        id: 'email_123',
        emailAddress: 'new@example.com',
      });
      mockClerkClient.users.updateUser.mockResolvedValue({});
      mockClerkClient.users.getUser.mockResolvedValue({
        emailAddresses: [{ id: 'email_old', emailAddress: 'old@example.com' }],
      });

      // Enable email sync
      (service as any).emailSyncEnabled = true;

      const result = await service.syncUserProfile(clerkUser);

      // Verify sync operations were called
      expect(
        mockClerkClient.emailAddresses.createEmailAddress,
      ).toHaveBeenCalledWith({
        userId: 'clerk_123',
        emailAddress: 'new@example.com',
        verified: true,
        primary: false,
      });

      expect(mockClerkClient.users.updateUser).toHaveBeenCalledWith(
        'clerk_123',
        {
          primaryEmailAddressId: 'email_123',
        },
      );

      // Verify audit logs
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'EMAIL_MISMATCH_DETECTED',
          }),
        }),
      });

      expect(result).toBeDefined();
    });

    it('should handle sync failure with retry logic', async () => {
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: 'clerk_123',
        nip: '123456789012345',
        isActive: true,
      };

      const clerkUser = {
        id: 'clerk_123',
        email: 'old@example.com',
      };

      const dataKaryawan = {
        nip: '123456789012345',
        email: 'new@example.com',
        statusAktif: 'Aktif',
        nama: 'Test User',
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(dataKaryawan);

      // Mock failure then success pattern for retry logic
      mockClerkClient.emailAddresses.createEmailAddress
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 'email_123',
          emailAddress: 'new@example.com',
        });

      mockClerkClient.users.updateUser.mockResolvedValue({});
      mockClerkClient.users.getUser.mockResolvedValue({
        emailAddresses: [{ id: 'email_old', emailAddress: 'old@example.com' }],
      });

      (service as any).emailSyncEnabled = true;
      (service as any).syncMaxRetries = 3;
      (service as any).syncRetryDelay = 10; // Short delay for testing

      const result = await service.syncUserProfile(clerkUser);

      // Should have retried 3 times (2 failures + 1 success)
      expect(
        mockClerkClient.emailAddresses.createEmailAddress,
      ).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should deny access when sync is disabled via config', async () => {
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: 'clerk_123',
        nip: '123456789012345',
        isActive: true,
      };

      const clerkUser = {
        id: 'clerk_123',
        email: 'old@example.com',
      };

      const dataKaryawan = {
        nip: '123456789012345',
        email: 'new@example.com',
        statusAktif: 'Aktif',
        nama: 'Test User',
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(dataKaryawan);

      // Disable email sync
      (service as any).emailSyncEnabled = false;

      await expect(service.syncUserProfile(clerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify no sync operations were attempted
      expect(
        mockClerkClient.emailAddresses.createEmailAddress,
      ).not.toHaveBeenCalled();
      expect(mockClerkClient.users.updateUser).not.toHaveBeenCalled();

      // Verify appropriate error message
      await expect(service.syncUserProfile(clerkUser)).rejects.toThrow(
        /email address does not match employee records/,
      );
    });

    it('should handle timeout during email sync', async () => {
      const existingProfile = {
        id: 'profile_123',
        clerkUserId: 'clerk_123',
        nip: '123456789012345',
        isActive: true,
      };

      const clerkUser = {
        id: 'clerk_123',
        email: 'old@example.com',
      };

      const dataKaryawan = {
        nip: '123456789012345',
        email: 'new@example.com',
        statusAktif: 'Aktif',
        nama: 'Test User',
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        existingProfile,
      );
      mockPrismaService.dataKaryawan.findUnique.mockResolvedValue(dataKaryawan);

      // Mock delayed response to trigger timeout
      mockClerkClient.emailAddresses.createEmailAddress.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      (service as any).emailSyncEnabled = true;
      (service as any).syncTimeout = 100; // Very short timeout for testing
      (service as any).syncMaxRetries = 1; // Single attempt for testing

      await expect(service.syncUserProfile(clerkUser)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify timeout was handled
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'EMAIL_MISMATCH',
            syncAttempted: true,
          }),
        }),
      });
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for failed authentication attempts', async () => {
      const mockClerkUser = {
        id: 'clerk_user_123',
        email: 'hacker@example.com',
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(null);

      try {
        await service.syncUserProfile(mockClerkUser);
      } catch (error) {
        // Expected to throw
      }

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: mockClerkUser.id,
          action: 'LOGIN',
          module: 'AUTH',
          entityType: 'USER',
          entityId: mockClerkUser.id,
          entityDisplay: mockClerkUser.email,
          metadata: expect.objectContaining({
            email: mockClerkUser.email,
            reason: 'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
          }),
        }),
      });
    });

    it('should track multiple failed attempts for security monitoring', async () => {
      const hackerEmails = [
        'hacker1@example.com',
        'hacker2@example.com',
        'hacker3@example.com',
      ];

      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.dataKaryawan.findFirst.mockResolvedValue(null);

      for (const email of hackerEmails) {
        const mockClerkUser = {
          id: `clerk_${email}`,
          email,
        };

        try {
          await service.syncUserProfile(mockClerkUser);
        } catch (error) {
          // Expected to throw
        }
      }

      // Should have tracked all failed attempts
      expect(mockSecurityMonitor.trackFailedLogin).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledTimes(3);
    });
  });
});
