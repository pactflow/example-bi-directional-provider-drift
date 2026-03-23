/**
 * Test-only Express routes for state management during Drift conformance tests
 *
 * These routes are mounted on the API server only when running under test
 * (api-inmemory.test.js). They are NOT part of the production application.
 *
 * The Lua lifecycle hooks in drift/product.lua call these endpoints before and
 * after each Drift test operation to put the in-memory repository into a known
 * state, ensuring each test runs against predictable data.
 *
 * Endpoints:
 *   POST /test/setup/:operationId  — seed the repository for a specific test scenario
 *   POST /test/reset               — clear all products and reset to defaults
 *
 * IMPORTANT: The operationId values here must exactly match the operation keys
 * defined in drift/drift.yaml. Adding a new Drift operation requires adding a
 * corresponding handler in setupStateHandlers below.
 */

const router = require('express').Router();
const controller = require('../src/product/product.controller');
const Product = require('../src/product/product');

/**
 * Maps each Drift operationId to a function that seeds the repository with
 * the state required for that test scenario to succeed (or fail as expected).
 *
 * The pattern follows: given this state → when Drift sends this request → then expect this response.
 */
const setupStateHandlers = {
  // GET /products — expects an array of products
  getAllProducts_Success: async (repo) => {
    await repo.setupProducts([
      new Product(9, "CREDIT_CARD", "Gem Visa", "v1"),
      new Product(10, "CREDIT_CARD", "28 Degrees", "v1"),
      new Product(11, "PERSONAL_LOAN", "MyFlexiPay", "v2"),
    ]);
  },
  // GET /products with invalid token — state is irrelevant; auth check happens first
  getAllProducts_Unauthorized: async (repo) => {
    await repo.resetProducts();
  },

  // POST /products — empty store so no ID conflicts occur
  createProduct_Success: async (repo) => {
    await repo.resetProducts();
  },
  // POST /products using the OAS example body — same requirement as above
  createProduct_SuccessWithExample: async (repo) => {
    await repo.resetProducts();
  },
  // POST /products with invalid token — state is irrelevant
  createProduct_Unauthorized: async (repo) => {
    await repo.resetProducts();
  },

  // GET /products/10 — product with ID 10 must exist
  getProductByID_Success: async (repo) => {
    await repo.setupProducts([
      { id: 10, type: "CREDIT_CARD", name: "28 Degrees", version: "v1" }
    ]);
  },
  // GET /products/invalid — validation rejects before hitting the store; state irrelevant
  getProductByID_InvalidID: async (repo) => {
    await repo.resetProducts();
  },
  // GET /products/99999 — store must be empty so the product is genuinely not found
  getProductByID_NotFound: async (repo) => {
    await repo.setupProducts([]);
  },
  // GET /products/10 with invalid token — auth check happens first; state irrelevant
  getProductByID_Unauthorized: async (repo) => {
    await repo.resetProducts();
  },
};

/**
 * POST /test/setup/:operationId
 *
 * Called by the Lua `operation:started` hook before each Drift test operation.
 * Seeds the repository with the state required for the named scenario.
 */
router.post('/test/setup/:operationId', async (req, res) => {
  try {
    const operationId = req.params.operationId;
    console.log("state setup for operation:", operationId);

    if (!setupStateHandlers[operationId]) {
      return res.status(400).send({
        message: `Unknown operation: ${operationId}`,
        availableOperations: Object.keys(setupStateHandlers)
      });
    }

    const repo = await controller.initializeRepository();
    await setupStateHandlers[operationId](repo);

    res.status(200).send({ message: `State set up for: ${operationId}` });
  } catch (error) {
    console.error('Error setting up state:', error);
    res.status(500).send({ message: 'Error setting up state', error: error.message });
  }
});

/**
 * POST /test/reset
 *
 * Called by the Lua `operation:finished` hook after each Drift test operation.
 * Resets the repository to a clean state so the next test starts fresh.
 */
router.post('/test/reset', async (req, res) => {
  console.log("state reset");
  try {
    const repo = await controller.initializeRepository();
    await repo.resetProducts();
    res.status(200).send({ message: 'State reset successfully' });
  } catch (error) {
    console.error('Error resetting state:', error);
    res.status(500).send({ message: 'Error resetting state', error: error.message });
  }
});

module.exports = router;
