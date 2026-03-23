# Example NodeJS Provider - Drift

[![Build Status](https://github.com/pactflow/example-provider/actions/workflows/build.yml/badge.svg)](https://github.com/pactflow/example-provider/actions)

[![Can I deploy Status](https://testdemo.pactflow.io/pacticipants/pactflow-example-provider/branches/master/latest-version/can-i-deploy/to-environment/production/badge)](https://testdemo.pactflow.io/pacticipants/pactflow-example-provider/branches/master/latest-version/can-i-deploy/to-environment/production/badge)

## Table of Contents

- [Example NodeJS Provider - Drift](#example-nodejs-provider---drift)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Key Points](#key-points)
  - [How Bi-Directional Contract Testing Works](#how-bi-directional-contract-testing-works)
  - [Compatible Consumers](#compatible-consumers)
  - [Pre-requisites](#pre-requisites)
  - [Installation](#installation)
    - [1. Authenticate Drift](#1-authenticate-drift)
    - [2. Install Node dependencies](#2-install-node-dependencies)
  - [Usage](#usage)
    - [PostgreSQL variant](#postgresql-variant)
  - [Project Structure](#project-structure)
  - [How Drift Testing Works](#how-drift-testing-works)
    - [The test loop](#the-test-loop)
    - [drift.yaml structure](#driftyaml-structure)
    - [Authentication](#authentication)
    - [State management](#state-management)
    - [JUnit output and contract publishing](#junit-output-and-contract-publishing)
  - [OS/Platform Considerations](#osplatform-considerations)
  - [Caveats](#caveats)
  - [Related Topics](#related-topics)
  - [Found an Issue?](#found-an-issue)

## Overview

This is an example of a NodeJS "Product" API Provider that uses [Drift](https://pactflow.github.io/drift-docs/), [PactFlow](https://pactflow.io), and GitHub Actions to generate and publish provider contracts as part of Bi-Directional Contract Testing (BDCT).

It performs pre-deployment cross-compatibility checks to ensure the provider is compatible with specified consumers using the BDCT capability of PactFlow.

See the full [PactFlow Bi-Directional Workshop](https://docs.pactflow.io/docs/workshops/bi-directional-contract-testing) for which this can be substituted in as the "provider".

## Key Points

- API written in [Express JS](https://expressjs.com/)
- Has an [OpenAPI 3.x](https://swagger.io/specification/) spec documenting the API (`openapi.yaml`)
- Uses **[Drift](https://pactflow.github.io/drift-docs/)** for API conformance testing — verifying that the running implementation matches its OpenAPI description
- Demonstrates Drift's **Lua lifecycle hooks** for per-test state setup and teardown
- Supports two storage backends and two state management strategies, illustrating how to apply Drift in different architectural contexts:
  - **In-memory** (default): no external dependencies; state is managed via test-only HTTP endpoints on the running server
  - **PostgreSQL**: production-like persistent storage; state is managed via a dedicated external state server

What is uploaded to PactFlow is the OpenAPI specification _together with the Drift test results_ — giving confidence that the spec accurately reflects what the API actually does, not just what was intended.

## How Bi-Directional Contract Testing Works

In the diagram below, you can see how the provider testing process fits into the BDCT flow. When `can-i-deploy` is called, PactFlow cross-validates the provider's OAS against the consumer's Pact to ensure compatibility — without the provider and consumer needing to coordinate directly.

```
Provider pipeline                     PactFlow
        |                                |
        |-- 1. run Drift tests           |
        |   (verify API against OAS)     |
        |                                |
        |-- 2. publish OAS + results --> |
        |   (the "provider contract")    |
        |                                |
        |-- 3. can-i-deploy? ---------> |
        |   <--- safe / blocked ------   | <-- cross-validates against
        |                                |     consumer Pact contracts
        |-- 4. deploy (if safe)          |
        |-- 5. record deployment ------> |
```

The project uses a `Makefile` to simulate a simple CI pipeline with two stages:

**Test:**
1. Run Drift to verify the API conforms to the OpenAPI spec
2. Publish the OAS + Drift results to PactFlow as a provider contract
3. Check if safe to deploy with `can-i-deploy`

**Deploy** (only from `master`):
1. Deploy the application to production
2. Record the deployment in PactFlow

## Compatible Consumers

This project is compatible with the following consumers:

- [pactflow-example-bi-directional-consumer-nock](https://github.com/pactflow/example-bi-directional-consumer-nock)
- [pactflow-example-bi-directional-consumer-msw](https://github.com/pactflow/example-bi-directional-consumer-msw)
- [pactflow-example-bi-directional-consumer-wiremock](https://github.com/pactflow/example-bi-directional-consumer-wiremock)
- [pactflow-example-bi-directional-consumer-mountebank](https://github.com/pactflow/example-bi-directional-consumer-mountebank)

## Pre-requisites

**Software:**

- Node.js 18+
- [Drift CLI](https://pactflow.github.io/drift-docs/installation) — installed and authenticated against your PactFlow account
- Docker (optional — only required for the PostgreSQL variant)
- A [PactFlow](https://pactflow.io) account with a valid API token

**Environment variables:**

| Variable | Description |
|---|---|
| `PACT_BROKER_TOKEN` | A valid PactFlow API token |
| `PACT_BROKER_BASE_URL` | Your PactFlow account URL, e.g. `https://myorg.pactflow.io` |

## Installation

### 1. Authenticate Drift

Drift is installed 
```bash
# Authenticate Drift against your PactFlow account
# (reads PACT_BROKER_TOKEN and PACT_BROKER_BASE_URL from the environment)
drift auth login
```

See the [Drift installation docs](https://pactflow.github.io/drift-docs/installation) for all platforms.

### 2. Install Node dependencies

```bash
npm install
```

## Usage

```bash
# Run tests locally (in-memory, no external dependencies)
make test

# Simulate the full CI pipeline locally
# (test → publish contract → can-i-deploy → deploy)
make fake_ci
```

`make fake_ci` runs the full pipeline using your local git commit and branch, exactly as GitHub Actions would.

### PostgreSQL variant

```bash
npm run db:start          # Start PostgreSQL via Docker Compose
npm run start:postgres    # Start the server backed by PostgreSQL
npm run test:postgres     # Run Drift conformance tests against PostgreSQL
```

See [POSTGRES_SETUP.md](POSTGRES_SETUP.md) for full configuration details.

## Project Structure

```
.
├── openapi.yaml                     # OpenAPI spec — the source of truth for BDCT
├── Makefile                         # CI pipeline tasks (test, publish, deploy)
│
├── src/
│   ├── product/
│   │   ├── product.js               # Product domain model
│   │   ├── product.routes.js        # Express route definitions
│   │   ├── product.controller.js    # Request handlers
│   │   ├── api-inmemory.test.js     # Jest entry point — Drift tests (in-memory)
│   │   ├── api-postgres.test.js     # Jest entry point — Drift tests (PostgreSQL)
│   │   └── repositories/
│   │       ├── RepositoryFactory.js  # Selects backend via REPOSITORY_TYPE env var
│   │       ├── InMemoryRepository.js # In-process Map-backed store
│   │       └── PostgresRepository.js # PostgreSQL-backed store
│   └── middleware/
│       └── auth.middleware.js        # Bearer token auth (timestamp-based)
│
├── drift/                            # Drift config for the in-memory variant
│   ├── drift.yaml                    # Test case definitions (8 operations)
│   ├── product.dataset.yaml          # Reusable test data
│   └── product.lua                   # Lifecycle hooks — calls test endpoints on the API
│
├── drift-postgres/                   # Drift config for the PostgreSQL variant
│   ├── drift.yaml                    # Same test operations as drift/
│   ├── product.dataset.yaml          # Test data (extended)
│   ├── product-postgres-http.lua     # Lifecycle hooks — calls external state server
│   └── product-postgres-local.lua    # Alternative: lifecycle hooks via local CLI script
│
└── automation/
    ├── drift.js                      # Spawns the Drift CLI; used by Jest test files
    ├── test.routes.js                # Test-only Express routes for in-memory state control
    └── setup-postgres-state-http.js  # Standalone HTTP state server for PostgreSQL tests
```

## How Drift Testing Works

### The test loop

For each operation defined in `drift.yaml`, Drift:

1. Fires `operation:started` → the Lua hook sets up the required database state
2. Constructs and sends the HTTP request to the running API
3. Validates the response against the OAS (status code, body schema, headers)
4. Fires `operation:finished` → the Lua hook resets state for the next test

```
drift verify
    │
    ├── operation:started ──> Lua hook ──> POST /test/setup/:operationId
    │                                      (seeds the repository for this scenario)
    │
    ├── HTTP request ─────────────────> Express API (localhost:8080)
    │
    ├── OAS validation ◄──────────── response
    │   (status code, response schema)
    │
    └── operation:finished ─> Lua hook ──> POST /test/reset
                                           (clears repository state)
```

### drift.yaml structure

Each operation in `drift.yaml` represents a single test scenario. The key fields are:

| Field | Purpose |
|---|---|
| `target` | Which OAS `operationId` to invoke (e.g. `source-oas:getAllProducts`) |
| `dataset` | Optional data file to parameterise the request body or path |
| `parameters` | Override specific path / query / header / body values for this test |
| `exclude` | Skip a global setting for this test (e.g. `- auth` for 401 scenarios) |
| `expected.response.statusCode` | The HTTP status code the API must return |

The naming convention `<operationId>_<Scenario>` (e.g. `getAllProducts_Success`, `getAllProducts_Unauthorized`) is deliberate — the operation key is passed to state setup hooks so the correct data can be seeded.

### Authentication

The API uses a timestamp-based Bearer token scheme. The Lua hook generates a fresh token for each request:

```lua
local function bearer_token()
  -- Returns the current UTC time as an ISO 8601 string, e.g. "2024-01-15T10:30:00Z"
  -- The auth middleware accepts any token that is a valid timestamp not in the future
  return os.date("!%Y-%m-%dT%H:%M:%SZ")
end
```

For 401 test scenarios, the global auth is excluded (`exclude: [auth]`) and an explicitly invalid token is supplied instead.

### State management

Because Drift exercises a **real running API**, each test needs a predictable starting state. The Lua lifecycle hooks handle this by calling a state management endpoint before and after each operation.

**In-memory variant** (`drift/product.lua`):

The hooks call test-only HTTP endpoints mounted directly on the API server (`automation/test.routes.js`):

```
POST /test/setup/:operationId  → seeds the in-memory repository
POST /test/reset               → clears the repository back to defaults
```

These routes are included only when running under test — they are **not** part of the production API.

**PostgreSQL variant** (`drift-postgres/product-postgres-http.lua`):

The hooks call a separate state management server (`automation/setup-postgres-state-http.js`) running on port 9000. This server connects to PostgreSQL directly and provides the same `/setup/:operationId` and `/reset` endpoints. This separation is necessary because the API server itself does not expose test routes in the PostgreSQL configuration.

> **Important:** The operation keys in `drift.yaml` (e.g. `getAllProducts_Success`) **must match** the handler names registered in the state management layer. Adding a new test operation requires adding a corresponding handler.

### JUnit output and contract publishing

Drift generates a JUnit XML report and a machine-readable `.result` file under `output/`. The Makefile's `publish_provider_contract` target uploads the OAS together with this result file to PactFlow:

```bash
pactflow publish-provider-contract openapi.yaml \
  --provider pactflow-example-provider \
  --provider-app-version <git-sha> \
  --branch <git-branch> \
  --verification-results output/results/verification.*.result \
  --verification-results-content-type application/vnd.smartbear.drift.result \
  --verifier drift
```

## OS/Platform Considerations

The `Makefile` is configured for Unix-based systems. It runs locally on macOS/Linux, or on Windows via [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install).

**Windows (PowerShell):** Environment variables use `$env:VARIABLE="value"` syntax. The `can-i-deploy` check can be run via Docker:

```powershell
docker run --rm -v ${PWD}:/app/tmp -e PACT_BROKER_BASE_URL -e PACT_BROKER_TOKEN `
  pactfoundation/pact:latest broker can-i-deploy `
  --pacticipant pactflow-example-provider `
  --version $env:GIT_COMMIT `
  --to-environment production `
  --retry-while-unknown 0 --retry-interval 10
```

## Caveats

- [OAS considerations for BDCT](https://docs.pactflow.io/docs/bi-directional-contract-testing/contracts/oas#considerations)
- You are responsible for ensuring sufficient OAS coverage. Drift reports deviations between what is _tested_ and the spec — untested operations are not reported as failures.
- The Bearer token authentication scheme used here (ISO 8601 timestamp) is intentionally simple for demo purposes and is not suitable for production use.

## Related Topics

- [Drift Documentation](https://pactflow.github.io/drift-docs/)
- [PactFlow Bi-Directional Contract Testing](https://docs.pactflow.io/docs/bi-directional-contract-testing)
- [Consumer Side BDCT Guide](https://docs.pactflow.io/docs/bi-directional-contract-testing/consumer)
- [Provider Side BDCT Guide](https://docs.pactflow.io/docs/bi-directional-contract-testing/provider)
- [PactFlow BDCT Workshop](https://docs.pactflow.io/docs/workshops/bi-directional-contract-testing)
- [Other BDCT Provider Examples](https://support.smartbear.com/swagger/contract-testing/docs/en/examples.html)

## Found an Issue?

Raise a [GitHub Issue](https://github.com/pactflow/example-provider/issues), or find us in the [Pact foundation Slack](https://slack.pact.io).
