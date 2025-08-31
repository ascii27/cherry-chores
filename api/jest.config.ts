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
      statements: 50,
      branches: 30,
      functions: 50,
      lines: 50
    }
  }
};

export default config;
