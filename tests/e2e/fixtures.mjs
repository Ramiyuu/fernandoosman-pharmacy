// Test-only fixtures for the local end-to-end stack (tests/e2e/dev-stack.mjs).
// Every value here exists only inside the in-memory test database and the
// in-process S3 stand-in. None of them work anywhere else.

export const TEST_ACCOUNTS = {
  admin: { email: 'admin@portfolio.test', password: 'local-admin-test-password', name: 'Fernando Osman' },
  noRole: { email: 'reader@portfolio.test', password: 'local-reader-test-password', name: 'Reader' },
};

export const DB_PORT = Number(process.env.E2E_DB_PORT ?? 54329);
export const R2_PORT = Number(process.env.E2E_R2_PORT ?? 54330);

export const TEST_R2 = {
  accountId: '0123456789abcdef0123456789abcdef',
  accessKeyId: 'e2e0000000000000000000000000000a',
  secretAccessKey: 'e2e-only-secret-access-key-0000000000000000000000000000000000000',
  bucket: 'portfolio-e2e',
};

// 32+ characters, test-only.
export const TEST_AUTH_SECRET = 'e2e-only-better-auth-secret-0000000000000000';
export const TEST_APP_DB_PASSWORD = 'e2e-app-role-password-000000000000';
