class Product {
    constructor(id, type, name, version) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.version = version;
        if (!id || !type || !name) {
            throw new Error("Invalid product");
        }
    }
}

module.exports = Product;