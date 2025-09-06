// Ensure tests do not attempt to use Postgres/Google OAuth
process.env.USE_DB = 'false';
// Provide a deterministic JWT secret for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
// Disable Google OAuth wiring in tests by clearing client vars
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.GOOGLE_CALLBACK_URL = '';
process.env.WEB_DIST = '';
