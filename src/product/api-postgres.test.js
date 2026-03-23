/**
 * Drift API Conformance Tests — PostgreSQL Repository
 *
 * This file is the Jest entry point for running Drift conformance tests against
 * the PostgreSQL variant of the Product API.
 *
 * How it differs from the in-memory variant:
 *   - The API server connects to a real PostgreSQL database instead of an in-process Map
 *   - State management (setup/teardown) is handled by a separate state server
 *     (automation/setup-postgres-state-http.js) running on port 9000, rather than
 *     test routes mounted on the API server itself
 *   - Drift uses drift-postgres/drift.yaml, which references product-postgres-http.lua
 *     for its lifecycle hooks — those hooks call the state server, not the API server
 *
 * Prerequisites (handled automatically by `npm run test:postgres`):
 *   - PostgreSQL running       (npm run db:start)
 *   - State server running     (npm run state-server:start)
 *
 * Test results and a JUnit XML report are written to output/ for CI consumption
 * and for publishing to PactFlow as part of the provider contract.
 */

// PostgreSQL connection config — must be set before any modules are loaded
process.env.REPOSITORY_TYPE = 'postgres';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'product_service';

const { runDrift } = require('../../automation/drift');
const controller = require('./product.controller');
const bodyParser = require('body-parser');

// Build the Express app that Drift will test against.
// Note: test.routes are NOT mounted here — state management is handled
// by the external state server (automation/setup-postgres-state-http.js).
const app = require('express')();
const authMiddleware = require('../middleware/auth.middleware');
app.use(bodyParser.json());
app.use(authMiddleware);
app.use(require('./product.routes'));
const server = app.listen("8080");

describe("API Tests with Drift - PostgreSQL", () => {
  afterAll(async () => {
    // Shut down the server and release the PostgreSQL connection pool
    await new Promise((resolve) => server.close(resolve));
    const repo = controller.getRepository();
    if (repo && typeof repo.close === 'function') {
      await repo.close();
    }
  });

  it("Validates the API conforms to its OpenAPI Description using PostgreSQL", async () => {
    // Exit code 0 = all Drift operations passed OAS validation
    const exitCode = await runDrift('postgres');
    expect(exitCode).toBe(0);
  })
});
