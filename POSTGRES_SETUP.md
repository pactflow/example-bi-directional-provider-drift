# PostgreSQL Setup Guide

## Overview

This project now supports both **in-memory** and **PostgreSQL** repositories. The repository type is configurable via the `REPOSITORY_TYPE` environment variable, defaulting to in-memory for backward compatibility.

## Quick Start

### Using In-Memory Repository (Default)

```bash
npm start
```

This uses the default in-memory repository with no external dependencies.

### Using PostgreSQL Repository

#### 1. Start the PostgreSQL database with Docker

```bash
npm run db:start
```

This starts a PostgreSQL container using `docker-compose.yml`.

#### 2. Start the server with PostgreSQL

```bash
npm run start:postgres
```

The server will:
- Connect to the PostgreSQL database at `localhost:5432`
- Automatically create the `products` table if it doesn't exist
- Initialize with default products

### Stopping and Resetting the Database

```bash
# Stop the database
npm run db:stop

# Reset the database (clears data and restarts)
npm run db:reset
```

## Environment Variables

You can customize the PostgreSQL connection by setting environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REPOSITORY_TYPE` | `inmemory` | Repository type: `inmemory` or `postgres` |
| `DB_HOST` | `localhost` | PostgreSQL server hostname |
| `DB_PORT` | `5432` | PostgreSQL server port |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_NAME` | `product_service` | PostgreSQL database name |
| `STATE_SERVER_URL` | `http://localhost:9000` | State management server URL (for Drift tests) |

### Example: Custom PostgreSQL Connection

```bash
REPOSITORY_TYPE=postgres \
DB_HOST=db.example.com \
DB_PORT=5432 \
DB_USER=myuser \
DB_PASSWORD=mypassword \
DB_NAME=my_products \
node server.js
```

Or using a `.env` file (see `.env.example`):

```bash
# .env
REPOSITORY_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=product_service
```

## Architecture

### Repository Pattern

Two repository implementations are available:

- **InMemoryRepository** (`src/product/repositories/InMemoryRepository.js`)
  - Stores products in a Map
  - No external dependencies
  - Data is lost on server restart
  - Suitable for development and testing

- **PostgresRepository** (`src/product/repositories/PostgresRepository.js`)
  - Stores products in PostgreSQL
  - Requires database connection
  - Data persists across restarts
  - Suitable for production

### Factory Pattern

[RepositoryFactory](src/product/repositories/RepositoryFactory.js) handles repository instantiation based on the `REPOSITORY_TYPE` environment variable.

## Database Schema

The PostgreSQL repository uses a single `products` table:

```sql
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    product_id INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50)
);
```

This table is created automatically when the PostgreSQL repository initializes.

## Docker Configuration

### docker-compose.yml

Starts a PostgreSQL 15 Alpine container with:
- User: `postgres`
- Password: `postgres`
- Database: `product_service`
- Port: `5432`
- Volume: `postgres_data` (persists data)
- Health check enabled

### Dockerfile.postgres

Simple PostgreSQL 15 Alpine image with environment variable configuration.

## Testing

### Unit Tests

The existing tests use the in-memory repository by default:

```bash
npm test
npm run test:pact
```

To test with PostgreSQL:

```bash
npm run test:postgres
```

This automatically:
1. Starts the PostgreSQL database
2. Starts the state management server
3. Runs the PostgreSQL-specific tests
4. Cleans up all resources

### Drift API Conformance Tests

This project includes Drift conformance tests in two variants:

**In-Memory Tests:**
```bash
npm test -- api-inmemory.test.js
```

**PostgreSQL Tests:**
```bash
npm run test:postgres
```

Both test suites verify the API against the OpenAPI specification. The PostgreSQL variant demonstrates state management via direct database manipulation.

### State Management Server

For PostgreSQL Drift tests, a state management server is required:

```bash
# Start the server (runs on port 9000)
npm run state-server:start

# Stop the server
npm run state-server:stop
```

The state server provides HTTP endpoints for test state transitions:
- `POST /setup/:operationId` - Setup state before an operation
- `POST /reset` - Reset all products
- `GET /health` - Health check

## Migration from In-Memory to PostgreSQL

1. Start PostgreSQL: `npm run db:start`
2. Switch the `REPOSITORY_TYPE` to `postgres`
3. The database schema will be created automatically
4. Default products will be initialized on first run
5. Existing setup/teardown endpoints will work with PostgreSQL

## Troubleshooting

### PostgreSQL Connection Refused

```bash
# Check if container is running
docker ps | grep product-service-postgres

# View logs
docker logs product-service-postgres

# Restart the database
npm run db:reset
```

### Port Already in Use

If port 5432 is already in use, modify the `docker-compose.yml` file to use a different port:

```yaml
ports:
  - "5433:5432"  # Use 5433 on host, 5432 in container
```

Then update the `DB_PORT` environment variable accordingly.

### State Server Port Conflict

If port 9000 is already in use, set the port via environment variable:

```bash
STATE_SERVER_PORT=9001 npm run state-server:start
```

And update the Lua test configuration to use the new port:

```bash
STATE_SERVER_URL=http://localhost:9001 drift verify --test-files ./drift-postgres/drift.yaml
```
