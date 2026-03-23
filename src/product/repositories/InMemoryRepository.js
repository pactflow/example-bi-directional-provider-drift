const Product = require('../product');

const defaultProducts = [
    ["9", new Product("9", "CREDIT_CARD", "Gem Visa", "v1", 59.95)],
    ["10", new Product("10", "CREDIT_CARD", "28 Degrees", "v1", 28.0)],
    ["11", new Product("11", "PERSONAL_LOAN", "MyFlexiPay", "v2", 199.0)],
];

class InMemoryRepository {

    constructor() {
        this.products = new Map(defaultProducts);
    }

    async fetchAll() {
        return [...this.products.values()]
    }

    async getById(id) {
        return this.products.get(id);
    }

    async add(product) {
        return this.products.set(product.id, product);
    }
    
    setupProducts(products) {
        this.products = new Map();
        const productList = Array.isArray(products) ? products : [];

        for (const product of productList) {
            const normalized = product instanceof Product
                ? product
                : new Product(product.id, product.type, product.name, product.version, product.price);
            this.products.set(`${normalized.id}`, normalized)
        }
    }

    resetProducts() {
        this.products = new Map(defaultProducts);
    }
}

module.exports = InMemoryRepository;
