/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageThreshold: {
    global: { lines: 70, branches: 60 },
  },
  collectCoverageFrom: [
    'lib/**/*.js',
    'app/api/**/*.js',
    '!app/api/auth/**',
    '!node_modules/**',
  ],
};

export default config;
