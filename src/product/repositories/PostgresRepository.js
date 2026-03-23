const { Pool } = require('pg');
const Product = require('../product');

class PostgresRepository {
    constructor(connectionConfig) {
        this.pool = new Pool(connectionConfig);
    }

    async initialize() {
        // Create products table if it doesn't exist
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(255) PRIMARY KEY,
                product_id INTEGER NOT NULL,
                type VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                version VARCHAR(50)
            )
        `);
    }

    async fetchAll() {
        try {
            const result = await this.pool.query('SELECT * FROM products ORDER BY product_id');
            return result.rows.map(row => 
                new Product(row.product_id, row.type, row.name, row.version)
            );
        } catch (error) {
            console.error('Error fetching all products:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM products WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return undefined;
            }
            const row = result.rows[0];
            return new Product(row.product_id, row.type, row.name, row.version);
        } catch (error) {
            console.error('Error getting product by id:', error);
            throw error;
        }
    }

    async add(product) {
        try {
            await this.pool.query(
                'INSERT INTO products (id, product_id, type, name, version) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET type = $3, name = $4, version = $5',
                [product.id, product.id, product.type, product.name, product.version]
            );
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async setupProducts(products) {
        try {
            // Clear existing products
            await this.pool.query('DELETE FROM products');

            const productList = Array.isArray(products) ? products : [];
            for (const product of productList) {
                const normalized = product instanceof Product
                    ? product
                    : new Product(product.id, product.type, product.name, product.version);
                await this.add(normalized);
            }
        } catch (error) {
            console.error('Error setting up products:', error);
            throw error;
        }
    }

    async resetProducts() {
        try {
            // Reset to default products
            await this.pool.query('DELETE FROM products');

        } catch (error) {
            console.error('Error resetting products:', error);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = PostgresRepository;
