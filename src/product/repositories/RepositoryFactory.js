const InMemoryRepository = require('./InMemoryRepository');
const PostgresRepository = require('./PostgresRepository');

class RepositoryFactory {
    static async create() {
        const repositoryType = process.env.REPOSITORY_TYPE || 'inmemory';
        
        if (repositoryType === 'postgres') {
            const connectionConfig = {
                user: process.env.DB_USER || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'product_service',
                password: process.env.DB_PASSWORD || 'postgres',
                port: parseInt(process.env.DB_PORT || '5432'),
            };

            const repository = new PostgresRepository(connectionConfig);
            await repository.initialize();
            return repository;
        }

        // Default to in-memory repository
        return new InMemoryRepository();
    }
}

module.exports = RepositoryFactory;
