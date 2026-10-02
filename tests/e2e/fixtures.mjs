// Test-only fixtures for the local Supabase stand-in (tests/e2e/mock-supabase.mjs).
// These accounts exist only inside the in-memory test database.

export const TEST_ACCOUNTS = {
  admin: { email: 'admin@portfolio.test', password: 'local-admin-test-password', role: 'admin', displayName: 'Fernando Osman' },
  noRole: { email: 'reader@portfolio.test', password: 'local-reader-test-password', role: null, displayName: 'Reader' },
};

export const MOCK_PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
// Fixed, public, test-only signing secret: tokens signed with it are worthless outside this process.
export const MOCK_JWT_SECRET = 'local-e2e-only-secret-do-not-use-in-production-000000';
