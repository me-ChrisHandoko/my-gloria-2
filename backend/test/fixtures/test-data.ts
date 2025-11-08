/**
 * Test data fixtures for consistent testing
 */

export const testFixtures = {
  /**
   * User fixtures
   */
  users: {
    admin: {
      id: 'user-admin',
      nip: 'NIP001',
      clerkUserId: 'clerk_admin',
      isActive: true,
      updatedAt: new Date(),
    },
    teacher: {
      id: 'user-teacher',
      nip: 'NIP002',
      clerkUserId: 'clerk_teacher',
      isActive: true,
      updatedAt: new Date(),
    },
    student: {
      id: 'user-student',
      nip: 'NIP003',
      clerkUserId: 'clerk_student',
      isActive: true,
      updatedAt: new Date(),
    },
    inactive: {
      id: 'user-inactive',
      nip: 'NIP004',
      clerkUserId: 'clerk_inactive',
      isActive: false,
      updatedAt: new Date(),
    },
  },

  /**
   * DataKaryawan fixtures (Employee master data)
   */
  dataKaryawan: {
    admin: {
      nip: 'NIP001',
      nama: 'Admin User',
      email: 'admin@gloria.test',
      noPonsel: '+628123456789',
      jenisKelamin: 'L',
      status: 'AKTIF',
      statusAktif: 'AKTIF',
      lokasi: 'SCH001',
      bagianKerja: 'Administration',
      bidangKerja: 'School Administration',
      jenisKaryawan: 'TETAP',
    },
    teacher: {
      nip: 'NIP002',
      nama: 'Teacher User',
      email: 'teacher@gloria.test',
      noPonsel: '+628123456790',
      jenisKelamin: 'P',
      status: 'AKTIF',
      statusAktif: 'AKTIF',
      lokasi: 'SCH001',
      bagianKerja: 'Academic',
      bidangKerja: 'Teaching',
      jenisKaryawan: 'TETAP',
    },
    student: {
      nip: 'NIP003',
      nama: 'Student User',
      email: 'student@gloria.test',
      noPonsel: '+628123456791',
      jenisKelamin: 'L',
      status: 'AKTIF',
      statusAktif: 'AKTIF',
      lokasi: 'SCH001',
      bagianKerja: 'Student',
      bidangKerja: 'Student',
      jenisKaryawan: 'STUDENT',
    },
    inactive: {
      nip: 'NIP004',
      nama: 'Inactive User',
      email: 'inactive@gloria.test',
      noPonsel: '+628123456792',
      jenisKelamin: 'L',
      status: 'TIDAK_AKTIF',
      statusAktif: 'TIDAK_AKTIF',
      lokasi: 'SCH001',
      bagianKerja: 'Administration',
      bidangKerja: 'School Administration',
      jenisKaryawan: 'KONTRAK',
    },
  },

  /**
   * Role fixtures
   */
  roles: {
    superAdmin: {
      id: 'role-super-admin',
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full system access',
      hierarchyLevel: 1,
      updatedAt: new Date(),
      isSystemRole: true,
      isActive: true,
    },
    admin: {
      id: 'role-admin',
      code: 'ADMIN',
      name: 'Admin',
      description: 'School administration',
      hierarchyLevel: 2,
      updatedAt: new Date(),
      isSystemRole: true,
      isActive: true,
    },
    teacher: {
      id: 'role-teacher',
      code: 'TEACHER',
      name: 'Teacher',
      description: 'Teaching staff',
      hierarchyLevel: 3,
      updatedAt: new Date(),
      isSystemRole: false,
      isActive: true,
    },
    student: {
      id: 'role-student',
      code: 'STUDENT',
      name: 'Student',
      description: 'Student access',
      hierarchyLevel: 4,
      updatedAt: new Date(),
      isSystemRole: false,
      isActive: true,
    },
  },

  /**
   * Permission fixtures
   */
  permissions: {
    // User permissions
    usersReadAll: {
      id: 'perm-users-read-all',

      code: 'USERS_READ_ALL',

      name: 'Read all users',

      resource: 'users',

      action: 'READ',

      scope: 'ALL',

      description: 'Read all users',
      updatedAt: new Date(),
    },
    usersWriteAll: {
      id: 'perm-users-write-all',

      code: 'USERS_WRITE_ALL',

      name: 'Write all users',

      resource: 'users',

      action: 'UPDATE',

      scope: 'ALL',

      description: 'Write all users',
      updatedAt: new Date(),
    },
    usersDeleteAll: {
      id: 'perm-users-delete-all',

      code: 'USERS_DELETE_ALL',

      name: 'Delete all users',

      resource: 'users',

      action: 'DELETE',

      scope: 'ALL',

      description: 'Delete all users',
      updatedAt: new Date(),
    },
    usersReadDepartment: {
      id: 'perm-users-read-dept',

      code: 'USERS_READ_DEPT',

      name: 'Read department users',

      resource: 'users',

      action: 'READ',

      scope: 'DEPARTMENT',

      description: 'Read department users',
      updatedAt: new Date(),
    },
    usersReadOwn: {
      id: 'perm-users-read-own',

      code: 'USERS_READ_OWN',

      name: 'Read own user profile',

      resource: 'users',

      action: 'READ',

      scope: 'OWN',

      description: 'Read own user profile',
      updatedAt: new Date(),
    },
    usersWriteOwn: {
      id: 'perm-users-write-own',

      code: 'USERS_WRITE_OWN',

      name: 'Update own user profile',

      resource: 'users',

      action: 'UPDATE',

      scope: 'OWN',

      description: 'Update own user profile',
      updatedAt: new Date(),
    },

    // School permissions
    schoolsReadAll: {
      id: 'perm-schools-read-all',

      code: 'SCHOOLS_READ_ALL',

      name: 'Read all schools',

      resource: 'schools',

      action: 'READ',

      scope: 'ALL',

      description: 'Read all schools',
      updatedAt: new Date(),
    },
    schoolsWriteAll: {
      id: 'perm-schools-write-all',

      code: 'SCHOOLS_WRITE_ALL',

      name: 'Write all schools',

      resource: 'schools',

      action: 'UPDATE',

      scope: 'ALL',

      description: 'Write all schools',
      updatedAt: new Date(),
    },
    schoolsReadSchool: {
      id: 'perm-schools-read-school',

      code: 'SCHOOLS_READ_SCHOOL',

      name: 'Read own school',

      resource: 'schools',

      action: 'READ',

      scope: 'SCHOOL',

      description: 'Read own school',
      updatedAt: new Date(),
    },

    // Department permissions
    departmentsReadAll: {
      id: 'perm-depts-read-all',

      code: 'DEPTS_READ_ALL',

      name: 'Read all departments',

      resource: 'departments',

      action: 'READ',

      scope: 'ALL',

      description: 'Read all departments',
      updatedAt: new Date(),
    },
    departmentsWriteAll: {
      id: 'perm-depts-write-all',

      code: 'DEPTS_WRITE_ALL',

      name: 'Write all departments',

      resource: 'departments',

      action: 'UPDATE',

      scope: 'ALL',

      description: 'Write all departments',
      updatedAt: new Date(),
    },
    departmentsReadDepartment: {
      id: 'perm-depts-read-dept',

      code: 'DEPTS_READ_DEPT',

      name: 'Read own department',

      resource: 'departments',

      action: 'READ',

      scope: 'DEPARTMENT',

      description: 'Read own department',
      updatedAt: new Date(),
    },

    // Workflow permissions
    workflowsApproveAll: {
      id: 'perm-workflows-approve-all',

      code: 'WORKFLOWS_APPROVE_ALL',

      name: 'Approve all workflows',

      resource: 'workflows',

      action: 'APPROVE',

      scope: 'ALL',

      description: 'Approve all workflows',
      updatedAt: new Date(),
    },
    workflowsApproveDepartment: {
      id: 'perm-workflows-approve-dept',

      code: 'WORKFLOWS_APPROVE_DEPT',

      name: 'Approve department workflows',

      resource: 'workflows',

      action: 'APPROVE',

      scope: 'DEPARTMENT',

      description: 'Approve department workflows',
      updatedAt: new Date(),
    },
    workflowsCreateOwn: {
      id: 'perm-workflows-create-own',

      code: 'WORKFLOWS_CREATE_OWN',

      name: 'Create own workflows',

      resource: 'workflows',

      action: 'CREATE',

      scope: 'OWN',

      description: 'Create own workflows',
      updatedAt: new Date(),
    },
  },

  /**
   * School fixtures
   */
  schools: {
    main: {
      id: 'school-main',
      code: 'SCH001',
      name: 'Gloria Main School',
      lokasi: 'Jakarta',
      address: '123 Main Street, Jakarta',
      phone: '+622112345678',
      email: 'main@gloria.org',
      principal: 'NIP001',
      updatedAt: new Date(),
      isActive: true,
    },
    branch: {
      id: 'school-branch',
      code: 'SCH002',
      name: 'Gloria Branch School',
      lokasi: 'Bandung',
      address: '456 Branch Road, Bandung',
      phone: '+622212345678',
      email: 'branch@gloria.org',
      principal: 'NIP005',
      updatedAt: new Date(),
      isActive: true,
    },
  },

  /**
   * Department fixtures
   */
  departments: {
    academic: {
      id: 'dept-academic',
      schoolId: 'school-main',
      code: 'ACAD',
      name: 'Academic Department',
      description: 'Handles academic affairs',
      headNip: 'NIP002',
      updatedAt: new Date(),
      isActive: true,
    },
    administration: {
      id: 'dept-admin',
      schoolId: 'school-main',
      code: 'ADMIN',
      name: 'Administration Department',
      description: 'Handles administrative tasks',
      headNip: 'NIP006',
      updatedAt: new Date(),
      isActive: true,
    },
    finance: {
      id: 'dept-finance',
      schoolId: 'school-main',
      code: 'FIN',
      name: 'Finance Department',
      description: 'Handles financial matters',
      headNip: 'NIP007',
      updatedAt: new Date(),
      isActive: true,
    },
  },

  /**
   * Position fixtures
   */
  positions: {
    principal: {
      id: 'pos-principal',
      code: 'PRINCIPAL',
      name: 'Principal',
      level: 1,
      departmentId: null,
      schoolId: 'school-main',
      updatedAt: new Date(),
      isActive: true,
    },
    vicePrincipal: {
      id: 'pos-vice-principal',
      code: 'VICE-PRINCIPAL',
      name: 'Vice Principal',
      level: 2,
      departmentId: null,
      schoolId: 'school-main',
      parentPositionId: 'pos-principal',
      updatedAt: new Date(),
      isActive: true,
    },
    headOfDepartment: {
      id: 'pos-head-dept',
      code: 'HEAD-DEPT',
      name: 'Head of Department',
      level: 3,
      departmentId: 'dept-academic',
      schoolId: 'school-main',
      parentPositionId: 'pos-vice-principal',
      updatedAt: new Date(),
      isActive: true,
    },
    teacher: {
      id: 'pos-teacher',
      code: 'TEACHER',
      name: 'Teacher',
      level: 4,
      departmentId: 'dept-academic',
      schoolId: 'school-main',
      parentPositionId: 'pos-head-dept',
      updatedAt: new Date(),
      isActive: true,
    },
  },

  /**
   * Workflow fixtures
   */
  workflows: {
    leaveRequest: {
      id: 'wf-leave-request',
      name: 'Leave Request',
      description: 'Employee leave request workflow',
      type: 'APPROVAL',
      status: 'ACTIVE',
      version: 1,
      isActive: true,
      config: {
        requiresAllApprovals: false,
        autoApproveAfterDays: 7,
        notifyOnCompletion: true,
      },
    },
    purchaseOrder: {
      id: 'wf-purchase-order',
      name: 'Purchase Order',
      description: 'Purchase order approval workflow',
      type: 'APPROVAL',
      status: 'ACTIVE',
      version: 1,
      isActive: true,
      config: {
        requiresAllApprovals: true,
        maxAmount: 10000000,
        requiresFinanceApproval: true,
      },
    },
  },

  /**
   * Module fixtures
   */
  modules: {
    users: {
      id: 'mod-users',
      code: 'USERS',
      name: 'User Management',
      description: 'User management module',
      icon: 'users',
      updatedAt: new Date(),
      path: '/users',
      order: 1,
      isActive: true,
    },
    schools: {
      id: 'mod-schools',
      code: 'SCHOOLS',
      name: 'School Management',
      description: 'School management module',
      icon: 'school',
      updatedAt: new Date(),
      path: '/schools',
      order: 2,
      isActive: true,
    },
    workflows: {
      id: 'mod-workflows',
      code: 'WORKFLOWS',
      name: 'Workflow Management',
      description: 'Workflow management module',
      icon: 'workflow',
      updatedAt: new Date(),
      path: '/workflows',
      order: 3,
      isActive: true,
    },
    reports: {
      id: 'mod-reports',
      code: 'REPORTS',
      name: 'Reports',
      description: 'Reporting module',
      icon: 'report',
      updatedAt: new Date(),
      path: '/reports',
      order: 10,
      isActive: true,
    },
  },

  /**
   * Notification template fixtures
   */
  notificationTemplates: {
    welcomeEmail: {
      id: 'tpl-welcome',
      code: 'WELCOME_EMAIL',
      name: 'Welcome Email',
      description: 'Welcome email for new users',
      type: 'EMAIL',
      updatedAt: new Date(),
      subject: 'Welcome to Gloria System',
      body: 'Welcome {{firstName}} {{lastName}} to Gloria System!',
      variables: ['firstName', 'lastName'],
      isActive: true,
    },
    passwordReset: {
      id: 'tpl-password-reset',
      code: 'PASSWORD_RESET',
      name: 'Password Reset',
      description: 'Password reset email',
      type: 'EMAIL',
      updatedAt: new Date(),
      subject: 'Reset Your Password',
      body: 'Click here to reset your password: {{resetLink}}',
      variables: ['resetLink', 'firstName'],
      isActive: true,
    },
    workflowApproval: {
      id: 'tpl-workflow-approval',
      code: 'WORKFLOW_APPROVAL',
      name: 'Workflow Approval',
      description: 'Workflow approval notification',
      type: 'PUSH',
      updatedAt: new Date(),
      subject: 'Approval Required',
      body: '{{workflowName}} requires your approval',
      variables: ['workflowName', 'submitterName'],
      isActive: true,
    },
  },
};

/**
 * Helper to get all fixtures as array for bulk operations
 */
export function getAllFixtures() {
  return {
    users: Object.values(testFixtures.users),
    roles: Object.values(testFixtures.roles),
    permissions: Object.values(testFixtures.permissions),
    schools: Object.values(testFixtures.schools),
    departments: Object.values(testFixtures.departments),
    positions: Object.values(testFixtures.positions),
    workflows: Object.values(testFixtures.workflows),
    modules: Object.values(testFixtures.modules),
    notificationTemplates: Object.values(testFixtures.notificationTemplates),
  };
}

/**
 * Helper to create role-permission associations
 */
export function getRolePermissionAssociations() {
  return [
    // Super Admin - all permissions
    {
      roleId: testFixtures.roles.superAdmin.id,
      permissions: Object.values(testFixtures.permissions).map((p) => p.id),
    },
    // Admin - all except delete
    {
      roleId: testFixtures.roles.admin.id,
      permissions: Object.values(testFixtures.permissions)
        .filter((p) => !p.action.includes('delete'))
        .map((p) => p.id),
    },
    // Teacher - department level permissions
    {
      roleId: testFixtures.roles.teacher.id,
      permissions: [
        testFixtures.permissions.usersReadDepartment.id,
        testFixtures.permissions.usersReadOwn.id,
        testFixtures.permissions.usersWriteOwn.id,
        testFixtures.permissions.departmentsReadDepartment.id,
        testFixtures.permissions.workflowsApproveDepartment.id,
        testFixtures.permissions.workflowsCreateOwn.id,
      ],
    },
    // Student - minimal permissions
    {
      roleId: testFixtures.roles.student.id,
      permissions: [
        testFixtures.permissions.usersReadOwn.id,
        testFixtures.permissions.usersWriteOwn.id,
        testFixtures.permissions.workflowsCreateOwn.id,
      ],
    },
  ];
}

/**
 * Helper to create user-role associations
 */
export function getUserRoleAssociations() {
  return [
    {
      userId: testFixtures.users.admin.id,
      roleId: testFixtures.roles.admin.id,
    },
    {
      userId: testFixtures.users.teacher.id,
      roleId: testFixtures.roles.teacher.id,
    },
    {
      userId: testFixtures.users.student.id,
      roleId: testFixtures.roles.student.id,
    },
  ];
}

/**
 * Helper to create user-position associations
 */
export function getUserPositionAssociations() {
  return [
    {
      userId: testFixtures.users.admin.id,
      positionId: testFixtures.positions.principal.id,
      isPrimary: true,
    },
    {
      userId: testFixtures.users.teacher.id,
      positionId: testFixtures.positions.teacher.id,
      isPrimary: true,
    },
  ];
}
