const Product = require("./product");
const RepositoryFactory = require("./repositories/RepositoryFactory");

let repository = null;

// Initialize repository asynchronously
const initializeRepository = async () => {
    if (!repository) {
        repository = await RepositoryFactory.create();
    }
    return repository;
};

exports.admin = async (req, res) => {
    console.log("admin");
    console.log(req.body);

    res.status(200).send();
};

exports.getAll = async (req, res) => {
    console.log("getAll");
    const repo = await initializeRepository();
    res.send(await repo.fetchAll())
};

exports.getById = async (req, res) => {
    console.log("getById", req.params.id);
    if (!req.params.id) {
        res.status(400).send({message: "Product ID is required"});
        return;
    }
    const repo = await initializeRepository();
    const product = await repo.getById(req.params.id);
    product ? res.send(product) : res.status(404).send({message: "Product not found"})
};

exports.create = async (req, res) => {
    console.log("create", req.body);
    try {
        const product = new Product(req.body.id, req.body.type, req.body.name, req.body.version, req.body.price);
        const repo = await initializeRepository();
        await repo.add(product);
        res.status(201).send()
    } catch (e) {
        res.status(400).send({message: "Invalid product"})
    }
};

exports.setup = async (req, res) => {
    console.log('setup', req.body)
    const repo = await initializeRepository();
    const products = Array.isArray(req.body.products) ? req.body.products : [];
    await repo.setupProducts(products)
    res.status(200).send()
};

exports.teardown = async (req, res) => {
    console.log('teardown')
    const repo = await initializeRepository();
    await repo.resetProducts()
    res.status(200).send()
};

exports.initializeRepository = initializeRepository;
exports.getRepository = () => repository;