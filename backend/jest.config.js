module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/index.ts',
    '!main.ts',
    '!**/*.module.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // Production-ready settings
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  // Properly handle async operations
  testTimeout: 10000,
  detectOpenHandles: false,
  forceExit: true,
  // Coverage thresholds for production
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
};