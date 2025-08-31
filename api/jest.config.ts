import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/repos.prisma.ts',
    '!<rootDir>/src/db/**'
  ],
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 40,
      functions: 60,
      lines: 55
    }
  }
};

export default config;
