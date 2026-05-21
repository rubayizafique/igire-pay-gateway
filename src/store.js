// This is our in-memory store (like a dictionary/map)
// It remembers every payment request we have seen before
// Key = the Idempotency-Key from the request header
// Value = the saved response + original request body

const store = new Map();

// Save a completed response against a key
function saveResponse(key, requestBody, responseData) {
  store.set(key, {
    requestBody: requestBody,
    responseData: responseData,
    status: 'completed'
  });
}

// Get a previously saved response by key
function getResponse(key) {
  return store.get(key) || null;
}

// Mark a key as "in-flight" (currently being processed)
function markInFlight(key, requestBody) {
  store.set(key, {
    requestBody: requestBody,
    status: 'in-flight'
  });
}

// Check if a key exists in the store
function hasKey(key) {
  return store.has(key);
}

// Clear the store (useful for testing)
function clearStore() {
  store.clear();
}

module.exports = {
  saveResponse,
  getResponse,
  markInFlight,
  hasKey,
  clearStore
};