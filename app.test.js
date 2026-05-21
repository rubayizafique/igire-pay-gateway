const request = require('supertest');
const app = require('./src/app');
const { clearStore } = require('./src/store');

// Clear the store before each test so tests don't affect each other
beforeEach(() => {
  clearStore();
});

// =====================
// HAPPY PATH TESTS
// =====================

test('should process a payment successfully on first request', async () => {
  const response = await request(app)
    .post('/process-payment')
    .set('Idempotency-Key', 'unique-key-001')
    .send({ amount: 100, currency: 'GHS' });

  expect(response.status).toBe(201);
  expect(response.body.message).toBe('Charged 100 GHS');
}, 10000);

// =====================
// IDEMPOTENCY TESTS
// =====================

test('should return same response for duplicate request', async () => {
  // First request
  await request(app)
    .post('/process-payment')
    .set('Idempotency-Key', 'unique-key-002')
    .send({ amount: 100, currency: 'GHS' });

  // Second request with same key and body
  const response = await request(app)
    .post('/process-payment')
    .set('Idempotency-Key', 'unique-key-002')
    .send({ amount: 100, currency: 'GHS' });

  expect(response.status).toBe(201);
  expect(response.body.message).toBe('Charged 100 GHS');
  expect(response.headers['x-cache-hit']).toBe('true');
}, 10000);

// =====================
// ERROR / EDGE CASE TESTS
// =====================

test('should return 400 if Idempotency-Key header is missing', async () => {
  const response = await request(app)
    .post('/process-payment')
    .send({ amount: 100, currency: 'GHS' });

  expect(response.status).toBe(400);
  expect(response.body.error).toBe('Missing Idempotency-Key header');
});

test('should return 422 if same key is used with different body', async () => {
  // First request
  await request(app)
    .post('/process-payment')
    .set('Idempotency-Key', 'unique-key-003')
    .send({ amount: 100, currency: 'GHS' });

  // Second request with same key but different amount
  const response = await request(app)
    .post('/process-payment')
    .set('Idempotency-Key', 'unique-key-003')
    .send({ amount: 500, currency: 'GHS' });

  expect(response.status).toBe(422);
  expect(response.body.error).toBe('Idempotency key already used for a different request body.');
}, 10000);

test('should return 200 on health check', async () => {
  const response = await request(app).get('/health');

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('OK');
});