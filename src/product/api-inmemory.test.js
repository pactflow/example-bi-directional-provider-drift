/**
 * Drift API Conformance Tests — In-Memory Repository
 *
 * This file is the Jest entry point for running Drift conformance tests against
 * the in-memory variant of the Product API.
 *
 * How it works:
 *   1. An Express server is spun up in-process on port 8080, mounting:
 *      - The production routes (product.routes)
 *      - Test-only state management routes (automation/test.routes)
 *   2. Jest invokes runDrift(), which shells out to `drift verify` pointing at
 *      drift/drift.yaml and http://localhost:8080.
 *   3. For each test operation, Drift fires lifecycle events that trigger the
 *      Lua hooks in drift/product.lua. Those hooks call the test-only routes to
 *      seed or reset the in-memory repository before/after each request.
 *   4. Drift validates each response against the OpenAPI spec (openapi.yaml).
 *   5. The Jest assertion simply checks that Drift exited with code 0 (all passed).
 *
 * Test results and a JUnit XML report are written to output/ for CI consumption
 * and for publishing to PactFlow as part of the provider contract.
 */

// Force the in-memory repository — must be set before any modules are loaded
process.env.REPOSITORY_TYPE = 'inmemory';

const { runDrift } = require('../../automation/drift');
const controller = require('./product.controller');
const bodyParser = require('body-parser');

// Build the Express app that Drift will test against
const app = require('express')();
const authMiddleware = require('../middleware/auth.middleware');
app.use(bodyParser.json());
app.use(authMiddleware);
app.use(require('./product.routes'));
app.use(require('../../automation/test.routes')); // Test-only: state setup/reset endpoints
const server = app.listen("8080");

describe("API Tests with Drift", () => {
  afterAll(async () => {
    // Shut down the server and close any open DB connections
    await new Promise((resolve) => server.close(resolve));
    const repo = controller.getRepository();
    if (repo && typeof repo.close === 'function') {
      await repo.close();
    }
    console.log("\n\n")
  });

  it("Validates the API conforms to its OpenAPI Description", async () => {
    // Exit code 0 = all Drift operations passed OAS validation
    const exitCode = await runDrift();
    expect(exitCode).toBe(0);
  })
});
