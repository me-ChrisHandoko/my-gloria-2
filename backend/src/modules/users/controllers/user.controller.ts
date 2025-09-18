import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from '../dto';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Public } from '../../../core/auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({
  path: 'users',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user profile with the provided data. Requires admin permissions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists with the provided clerkUserId or NIP',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user data provided',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieves a paginated list of all users with optional filtering and sorting.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: PaginatedUserResponseDto,
  })
  async findAll(
    @Query() queryDto: QueryUserDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.userService.findAll(queryDto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieves the profile of the currently authenticated user based on their Clerk ID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found for the authenticated user',
  })
  async getCurrentUser(@CurrentUser() user: any): Promise<UserResponseDto> {
    return this.userService.findByClerkId(user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Retrieves statistics about users in the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        activeUsers: { type: 'number', example: 150 },
      },
    },
  })
  async getStats() {
    const activeUsers = await this.userService.getActiveUsersCount();
    return {
      activeUsers,
    };
  }

  @Get('by-nip/:nip')
  @ApiOperation({
    summary: 'Get user by NIP',
    description: 'Retrieves a user profile by their employee ID (NIP).',
  })
  @ApiParam({
    name: 'nip',
    description: 'Employee ID (NIP)',
    example: '123456789012345',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found with the provided NIP',
  })
  async findByNip(@Param('nip') nip: string): Promise<UserResponseDto> {
    return this.userService.findByNip(nip);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieves a specific user profile by their unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description:
      'Updates a user profile with the provided data. Cannot update clerkUserId or NIP.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not active',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete user',
    description:
      'Marks a user as inactive (soft delete). The user data is retained but the account is deactivated.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponseDto> {
    return this.userService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore soft-deleted user',
    description:
      'Restores a previously soft-deleted user by marking them as active again.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User restored successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async restore(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponseDto> {
    return this.userService.restore(id);
  }

  @Post('sync/:clerkUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync user with Clerk',
    description:
      'Synchronizes user data with Clerk authentication service. Creates a new user if not exists, otherwise updates existing user.',
  })
  @ApiParam({
    name: 'clerkUserId',
    description: 'Clerk User ID',
    example: 'user_2abc123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User synced successfully',
    type: UserResponseDto,
  })
  async syncWithClerk(
    @Param('clerkUserId') clerkUserId: string,
    @Body() clerkUserData: any,
  ): Promise<UserResponseDto> {
    return this.userService.syncWithClerk(clerkUserId, clerkUserData);
  }

  @Get('health/check')
  @Public()
  @ApiOperation({
    summary: 'Health check',
    description: 'Simple health check endpoint for the users module.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        module: { type: 'string', example: 'users' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  healthCheck() {
    return {
      status: 'ok',
      module: 'users',
      timestamp: new Date().toISOString(),
    };
  }
}
