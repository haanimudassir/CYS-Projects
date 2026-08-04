process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:3000';
