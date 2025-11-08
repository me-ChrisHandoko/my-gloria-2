import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { v7 as uuidv7 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from '../dto';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  InvalidUserDataException,
  UserNotActiveException,
} from '../exceptions/user.exception';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user already exists
      const [existingByClerkId, existingByNip] = await Promise.all([
        this.userRepository.existsByClerkId(createUserDto.clerkUserId),
        this.userRepository.existsByNip(createUserDto.nip),
      ]);

      if (existingByClerkId) {
        throw new UserAlreadyExistsException(
          'clerkUserId',
          createUserDto.clerkUserId,
        );
      }

      if (existingByNip) {
        throw new UserAlreadyExistsException('NIP', createUserDto.nip);
      }

      // Create user with generated UUID
      const userId = uuidv7();
      const user = await this.userRepository.create({
        ...createUserDto,
        id: userId,
      });

      this.logger.log(`User created successfully with ID: ${userId}`);

      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);

      if (error instanceof UserAlreadyExistsException) {
        throw error;
      }

      throw new InvalidUserDataException(
        error.message || 'Failed to create user',
      );
    }
  }

  async findAll(queryDto: QueryUserDto): Promise<PaginatedUserResponseDto> {
    try {
      const { page, limit, search, isActive, sortBy, sortOrder } = queryDto;

      const filters = {
        search,
        isActive,
      };

      const sortOptions = {
        sortBy,
        sortOrder,
      };

      const result = await this.userRepository.findAll(
        page!,
        limit!,
        filters,
        sortOptions,
      );

      // Map dataKaryawan fields to user fields for proper display
      const mappedData = result.data.map((user: any) => ({
        ...user,
        name: user.dataKaryawan?.nama || '',
        email: user.dataKaryawan?.email || '',
      }));

      const transformedData = plainToInstance(UserResponseDto, mappedData, {
        excludeExtraneousValues: true,
      });

      return {
        data: transformedData,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new InvalidUserDataException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new UserNotFoundException(id);
      }

      // Map dataKaryawan fields to user fields
      const mappedUser = {
        ...user,
        name: user.dataKaryawan?.nama || '',
        email: user.dataKaryawan?.email || '',
      };

      return plainToInstance(UserResponseDto, mappedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error fetching user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to fetch user');
    }
  }

  async findByClerkId(clerkUserId: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findByClerkId(clerkUserId);

      if (!user) {
        throw new UserNotFoundException(clerkUserId);
      }

      // Update last active timestamp
      await this.userRepository.updateLastActive(user.id);

      // Map dataKaryawan fields to user fields
      const mappedUser = {
        ...user,
        name: user.dataKaryawan?.nama || '',
        email: user.dataKaryawan?.email || '',
      };

      return plainToInstance(UserResponseDto, mappedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error fetching user by Clerk ID ${clerkUserId}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to fetch user');
    }
  }

  async findByNip(nip: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findByNip(nip);

      if (!user) {
        throw new UserNotFoundException(nip);
      }

      // Map dataKaryawan fields to user fields
      const mappedUser = {
        ...user,
        name: user.dataKaryawan?.nama || '',
        email: user.dataKaryawan?.email || '',
      };

      return plainToInstance(UserResponseDto, mappedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error fetching user by NIP ${nip}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to fetch user');
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);

      if (!existingUser) {
        throw new UserNotFoundException(id);
      }

      // Check if user is active
      if (!existingUser.isActive) {
        throw new UserNotActiveException(id);
      }

      const updatedUser = await this.userRepository.update(id, updateUserDto);

      this.logger.log(`User ${id} updated successfully`);

      return plainToInstance(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (
        error instanceof UserNotFoundException ||
        error instanceof UserNotActiveException
      ) {
        throw error;
      }

      this.logger.error(
        `Error updating user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to update user');
    }
  }

  async remove(id: string): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);

      if (!existingUser) {
        throw new UserNotFoundException(id);
      }

      // Soft delete the user
      const deletedUser = await this.userRepository.softDelete(id);

      this.logger.log(`User ${id} soft deleted successfully`);

      return plainToInstance(UserResponseDto, deletedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error deleting user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to delete user');
    }
  }

  async restore(id: string): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);

      if (!existingUser) {
        throw new UserNotFoundException(id);
      }

      // Restore the user
      const restoredUser = await this.userRepository.update(id, {
        isActive: true,
      });

      this.logger.log(`User ${id} restored successfully`);

      return plainToInstance(UserResponseDto, restoredUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error restoring user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to restore user');
    }
  }

  async getActiveUsersCount(): Promise<number> {
    try {
      return await this.userRepository.countActiveUsers();
    } catch (error) {
      this.logger.error(
        `Error counting active users: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to count active users');
    }
  }

  async getUsersWithRoles(roleIds: string[]): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.findUsersWithRoles(roleIds);

      return plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching users with roles: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to fetch users with roles');
    }
  }

  async syncWithClerk(
    clerkUserId: string,
    clerkUserData: any,
  ): Promise<UserResponseDto> {
    try {
      const email = clerkUserData.emailAddresses?.[0]?.emailAddress;

      // CRITICAL SECURITY: Validate user exists in DataKaryawan with active status
      if (email) {
        const dataKaryawan = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              equals: email,
              mode: 'insensitive',
            },
            statusAktif: 'Aktif',
          },
        });

        if (!dataKaryawan) {
          // Log the unauthorized attempt for security monitoring
          this.logger.warn(
            `Unauthorized sync attempt for ${email} - Not found in DataKaryawan or inactive`,
          );

          // Create audit log for security tracking
          await this.createSecurityAuditLog(clerkUserId, 'SYNC_UNAUTHORIZED', {
            email,
            reason: 'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
            endpoint: 'syncWithClerk',
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message:
              'Access denied. User not authorized in the employee database.',
            code: 'USER_NOT_AUTHORIZED',
          });
        }

        // Use NIP from DataKaryawan for consistency
        clerkUserData.publicMetadata = clerkUserData.publicMetadata || {};
        clerkUserData.publicMetadata.nip = dataKaryawan.nip;
      }

      // Check if user profile already exists
      const user = await this.userRepository.findByClerkId(clerkUserId);

      if (!user) {
        // Ensure we have valid DataKaryawan before creating
        if (!email) {
          throw new InvalidUserDataException(
            'Email is required for user creation',
          );
        }

        // Get DataKaryawan again to ensure NIP is available
        const dataKaryawan = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              equals: email,
              mode: 'insensitive',
            },
            statusAktif: 'Aktif',
          },
        });

        if (!dataKaryawan) {
          throw new UnauthorizedException({
            statusCode: 403,
            message:
              'Access denied. User not authorized in the employee database.',
            code: 'USER_NOT_AUTHORIZED',
          });
        }

        // Create new user with validated DataKaryawan NIP
        const createDto: CreateUserDto = {
          clerkUserId,
          nip: dataKaryawan.nip, // Always use NIP from DataKaryawan
          email,
          firstName: clerkUserData.firstName,
          lastName: clerkUserData.lastName,
        };

        this.logger.log(
          `Creating user profile via sync for active employee: ${email} (NIP: ${dataKaryawan.nip})`,
        );

        return this.create(createDto);
      }

      // For existing users, re-validate their DataKaryawan status
      const dataKaryawan = await this.prisma.dataKaryawan.findUnique({
        where: { nip: user.nip },
        select: { statusAktif: true, email: true },
      });

      if (!dataKaryawan || dataKaryawan.statusAktif !== 'Aktif') {
        this.logger.warn(
          `Access denied during sync for ${email} - Employee status is not active`,
        );

        // Deactivate user profile
        await this.userRepository.update(user.id, { isActive: false });

        // Create audit log
        await this.createSecurityAuditLog(clerkUserId, 'SYNC_DEACTIVATED', {
          email,
          reason: 'EMPLOYEE_NOT_ACTIVE',
          nip: user.nip,
          timestamp: new Date().toISOString(),
        });

        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Employee status is not active.',
          code: 'EMPLOYEE_NOT_ACTIVE',
        });
      }

      // Update existing user
      const updateDto: UpdateUserDto = {
        email: clerkUserData.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUserData.firstName,
        lastName: clerkUserData.lastName,
      };

      this.logger.log(`Updating user profile via sync for: ${email}`);

      return this.update(user.id, updateDto);
    } catch (error) {
      // Re-throw UnauthorizedException for proper error handling
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `Error syncing user with Clerk: ${error.message}`,
        error.stack,
      );
      throw new InvalidUserDataException('Failed to sync user with Clerk');
    }
  }

  /**
   * Create security audit log for tracking unauthorized access attempts
   */
  private async createSecurityAuditLog(
    userId: string,
    action: string,
    data: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: uuidv7(),
          actorId: userId,
          action: 'LOGIN', // Map to existing AuditAction enum
          module: 'USER_SYNC',
          entityType: 'USER',
          entityId: userId,
          entityDisplay: data.email || userId,
          metadata: {
            ...data,
            securityAction: action,
          },
          ipAddress: data.ipAddress || '0.0.0.0',
          userAgent: data.userAgent || 'System',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create security audit log: ${error.message}`);
    }
  }
}
