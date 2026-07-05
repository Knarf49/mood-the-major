/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts", "**/tests/**/*.test.ts"],
  clearMocks: true,
  testTimeout: 30000,
};
