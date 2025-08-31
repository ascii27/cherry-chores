import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/repos.prisma.ts',
    '!<rootDir>/src/db/**',
    // Exclude runtime-only Postgres repositories from unit coverage
    '!<rootDir>/src/repos.pg.ts',
    '!<rootDir>/src/repos.chores.pg.ts',
    // Exclude Google OAuth runtime wiring (requires external service)
    '!<rootDir>/src/auth.google.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 30,
      functions: 50,
      lines: 50
    }
  }
};

export default config;
