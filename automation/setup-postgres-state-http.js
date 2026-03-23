// State management server for PostgreSQL test state setup via HTTP API
// This server listens for state setup requests and directly manipulates the PostgreSQL database accordingly.
// It is designed to be used in conjunction with Drift for API testing, allowing test cases to set up their required state before execution.
// Usage:  
//   node setup-postgres-state-http.js server - Starts the state management HTTP server
//   node setup-postgres-state-http.js setup <operationId> - Sets up the database state for the specified operation ID via HTTP request
//   node setup-postgres-state-http.js reset - Resets the database state by clearing all products via HTTP request
// Example:
//   node setup-postgres-state-http.js setup getAllProducts_Success
//   node setup-postgres-state-http.js reset
// This is an alternative implementation to the direct script version (setup-postgres-state.js) that provides an HTTP API for state management, allowing for more flexible integration with test frameworks and potentially easier debugging, at the cost of some overhead from running an HTTP server.
const express = require('express');
const { Pool } = require('pg');

// PostgreSQL connection configuration from environment
const connectionConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'product_service',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const PORT = process.env.STATE_SERVER_PORT || 9000;

// Create Express app
const app = express();
app.use(express.json());

// Global pool connection
let pool = null;

// Initialize pool on startup
const initializePool = async () => {
    const maxRetries = 60; // 60 second timeout
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            pool = new Pool(connectionConfig);
            // Test connection
            await pool.query('SELECT 1');
            
            // Ensure table exists
            await pool.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id VARCHAR(255) PRIMARY KEY,
                    type VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    version VARCHAR(50),
                    price NUMERIC(10, 2) NOT NULL
                )
            `);
            await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2)');
            await pool.query('UPDATE products SET price = 0 WHERE price IS NULL');
            await pool.query('ALTER TABLE products ALTER COLUMN price SET NOT NULL');
            console.log('Database initialized successfully');
            return;
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                console.log(`Database connection failed (attempt ${retries}/${maxRetries}). Retrying in 1s...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (pool) {
                    try {
                        await pool.end();
                    } catch (e) {
                        // ignore
                    }
                }
            } else {
                console.error('Failed to initialize database after 60 seconds:', error);
                process.exit(1);
            }
        }
    }
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
            ["9", "CREDIT_CARD", "Gem Visa", "v1", 59.95],
            ["10", "CREDIT_CARD", "28 Degrees", "v1", 28.0],
            ["11", "PERSONAL_LOAN", "MyFlexiPay", "v2", 199.0],
        ];
        for (const [id, type, name, version, price] of products) {
            await pool.query(
                'INSERT INTO products (id, type, name, version, price) VALUES ($1, $2, $3, $4, $5)',
                [id, type, name, version, price]
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
            'INSERT INTO products (id, type, name, version, price) VALUES ($1, $2, $3, $4, $5)',
            ['10', 'CREDIT_CARD', '28 Degrees', 'v1', 28.0]
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
                type VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                version VARCHAR(50),
                price NUMERIC(10, 2) NOT NULL
            )
        `);
        await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2)');
        await pool.query('UPDATE products SET price = 0 WHERE price IS NULL');
        await pool.query('ALTER TABLE products ALTER COLUMN price SET NOT NULL');

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Setup state endpoint
app.post('/setup/:operationId', async (req, res) => {
    try {
        const operationId = req.params.operationId;
        
        if (!setupStateHandlers[operationId]) {
            return res.status(400).json({ 
                error: `Unknown operation: ${operationId}`,
                availableOperations: Object.keys(setupStateHandlers)
            });
        }

        await setupStateHandlers[operationId](pool);
        res.status(200).json({ 
            message: `Successfully set up state for operation: ${operationId}` 
        });
    } catch (error) {
        console.error('Error setting up state:', error);
        res.status(500).json({ 
            error: 'Error setting up state',
            details: error.message 
        });
    }
});

// Reset state endpoint
app.post('/reset', async (req, res) => {
    try {
        await pool.query('DELETE FROM products');
        res.status(200).json({ 
            message: 'Successfully reset database state' 
        });
    } catch (error) {
        console.error('Error resetting state:', error);
        res.status(500).json({ 
            error: 'Error resetting state',
            details: error.message 
        });
    }
});

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

// Start server
const startServer = async () => {
    await initializePool();
    app.listen(PORT, () => {
        console.log(`State management server listening on port ${PORT}`);
    });
};

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    console.log('Shutting down state server...');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

// Get operation ID from command line argument
const command = process.argv[2];
const operationId = process.argv[3];

if (!command || (command === 'setup' && !operationId)) {
    console.error('Usage: node setup-postgres-state-http.js <setup|reset> [operationId]');
    process.exit(1);
}

if (command === 'setup') {
    setupState(operationId);
} else if (command === 'reset') {
    resetState();
} else if (command === 'server') {
    startServer();
} else {
    console.error('Unknown command: ' + command);
    process.exit(1);
}
