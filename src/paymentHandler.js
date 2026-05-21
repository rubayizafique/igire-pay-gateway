// This file contains the core payment processing logic
// It handles all three scenarios:
// 1. First time request - process and save
// 2. Duplicate request - return saved response
// 3. Same key different body - reject with error

const { saveResponse, getResponse, markInFlight, hasKey } = require('./store');

// This simulates a 2 second payment processing delay
function processPayment(amount, currency) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        message: `Charged ${amount} ${currency}`,
        transactionId: `TXN-${Date.now()}`,
        amount: amount,
        currency: currency,
        timestamp: new Date().toISOString()
      });
    }, 2000);
  });
}

// This is the main handler for POST /process-payment
async function handlePayment(req, res) {
  // Step 1: Get the idempotency key from the header
  const idempotencyKey = req.headers['idempotency-key'];

  // Step 2: Reject if no key is provided
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Missing Idempotency-Key header'
    });
  }

  // Step 3: Get the request body
  const requestBody = req.body;

  // Step 4: Check if we have seen this key before
  if (hasKey(idempotencyKey)) {
    const existing = getResponse(idempotencyKey);

    // Step 4a: Key is still being processed (in-flight)
    // Wait and keep checking every 100ms until it completes
    if (existing.status === 'in-flight') {
      const result = await waitForCompletion(idempotencyKey);
      return res.status(result.responseData.statusCode)
        .set('X-Cache-Hit', 'true')
        .json(result.responseData.body);
    }

    // Step 4b: Key exists but body is different - reject it
    const existingBody = JSON.stringify(existing.requestBody);
    const newBody = JSON.stringify(requestBody);

    if (existingBody !== newBody) {
      return res.status(422).json({
        error: 'Idempotency key already used for a different request body.'
      });
    }

    // Step 4c: Same key same body - return cached response
    return res.status(existing.responseData.statusCode)
      .set('X-Cache-Hit', 'true')
      .json(existing.responseData.body);
  }

  // Step 5: First time we see this key - mark as in-flight
  markInFlight(idempotencyKey, requestBody);

  // Step 6: Process the payment
  const result = await processPayment(requestBody.amount, requestBody.currency);

  // Step 7: Save the response for future duplicate requests
  const responseData = {
    statusCode: 201,
    body: result
  };
  saveResponse(idempotencyKey, requestBody, responseData);

  // Step 8: Return the response
  return res.status(201).json(result);
}

// This function waits for an in-flight request to complete
// It checks every 100ms up to 30 seconds
function waitForCompletion(key) {
  return new Promise((resolve, reject) => {
    const maxWait = 30000;
    const interval = 100;
    let elapsed = 0;

    const check = setInterval(() => {
      const entry = getResponse(key);

      if (entry && entry.status === 'completed') {
        clearInterval(check);
        resolve(entry);
      }

      elapsed += interval;
      if (elapsed >= maxWait) {
        clearInterval(check);
        reject(new Error('Timed out waiting for in-flight request'));
      }
    }, interval);
  });
}

module.exports = { handlePayment };