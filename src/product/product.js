class Product {
    constructor(id, type, name, version, price) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.version = version;
        this.price = price;
        if (!id || !type || !name || price === undefined || price === null) {
            throw new Error("Invalid product");
        }
    }
}

module.exports = Product;