// State management script for PostgreSQL test state setup
// This script can be invoked with command line arguments to set up specific test states or reset the database.
// It is designed to be used in conjunction with Drift for API testing, allowing test cases to set up their required state before execution.
// Usage:
//   node setup-postgres-state.js setup <operationId> - Sets up the database state for the specified operation ID
//   node setup-postgres-state.js reset - Resets the database state by clearing all products
// Example:
//   node setup-postgres-state.js setup getAllProducts_Success
//   node setup-postgres-state.js reset
// This is an alternative implementation to the HTTP server version (setup-postgres-state-http.js) that directly manipulates the database state without the overhead of starting an HTTP server, making it faster for test execution.
const { Pool } = require('pg');

// PostgreSQL connection configuration from environment
const connectionConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'product_service',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
};

// State setup handlers - directly manipulate Postgres
const setupStateHandlers = {
    // Reset handler - clears all products
    reset: async (pool) => {
        await pool.query('DELETE FROM products');
    },

    // getAllProducts operations
    getAllProducts_Success: async (pool) => {
        await pool.query('DELETE FROM products');
        const products = [
            [9, "CREDIT_CARD", "Gem Visa", "v1"],
            [10, "CREDIT_CARD", "28 Degrees", "v1"],
            [11, "PERSONAL_LOAN", "MyFlexiPay", "v2"],
        ];
        for (const [id, type, name, version] of products) {
            await pool.query(
                'INSERT INTO products (id, product_id, type, name, version) VALUES ($1, $2, $3, $4, $5)',
                [String(id), id, type, name, version]
            );
        }
    },
    getAllProducts_Unauthorized: async (pool) => {
        await pool.query('DELETE FROM products');
    },

    // createProduct operations
    createProduct_Success: async (pool) => {
        await pool.query('DELETE FROM products');
    },
    createProduct_SuccessWithExample: async (pool) => {
        await pool.query('DELETE FROM products');
    },
    createProduct_Unauthorized: async (pool) => {
        await pool.query('DELETE FROM products');
    },

    // getProductByID operations
    getProductByID_Success: async (pool) => {
        await pool.query('DELETE FROM products');
        await pool.query(
            'INSERT INTO products (id, product_id, type, name, version) VALUES ($1, $2, $3, $4, $5)',
            ['10', 10, 'CREDIT_CARD', '28 Degrees', 'v1']
        );
    },
    getProductByID_InvalidID: async (pool) => {
        await pool.query('DELETE FROM products');
    },
    getProductByID_NotFound: async (pool) => {
        await pool.query('DELETE FROM products');
    },
    getProductByID_Unauthorized: async (pool) => {
        await pool.query('DELETE FROM products');
    },
};

// Initialize Postgres and setup state
const setupState = async (operationId) => {
    const pool = new Pool(connectionConfig);

    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(255) PRIMARY KEY,
                product_id INTEGER NOT NULL,
                type VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                version VARCHAR(50)
            )
        `);

        // Run the setup handler
        if (!setupStateHandlers[operationId]) {
            console.error(`Unknown operation: ${operationId}`);
            console.error(`Available operations: ${Object.keys(setupStateHandlers).join(', ')}`);
            process.exit(1);
        }

        await setupStateHandlers[operationId](pool);
        console.log(`Successfully set up state for operation: ${operationId}`);
        process.exit(0);
    } catch (error) {
        console.error(`Error setting up state for ${operationId}:`, error);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

// Reset all products
const resetState = async () => {
    const pool = new Pool(connectionConfig);

    try {
        await pool.query('DELETE FROM products');
        console.log('Successfully reset database state');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting state:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

// Get operation ID from command line argument
const command = process.argv[2];
const operationId = process.argv[3];

if (!command || (command === 'setup' && !operationId)) {
    console.error('Usage: node setup-postgres-state.js <setup|reset> [operationId]');
    process.exit(1);
}

if (command === 'setup') {
    setupState(operationId);
} else if (command === 'reset') {
    resetState();
} else {
    console.error('Unknown command: ' + command);
    process.exit(1);
}
