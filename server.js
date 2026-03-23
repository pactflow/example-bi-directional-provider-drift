const app = require('express')();
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./src/product/product.routes');
const authMiddleware = require('./src/middleware/auth.middleware');
const controller = require('./src/product/product.controller');

const port = 8080;

const init = async () => {
    // Initialize repository before setting up routes
    await controller.initializeRepository();
    
    app.use(cors());
    app.use(authMiddleware);
    app.use(bodyParser.json());
    app.use(routes);
    return app.listen(port, () => console.log(`Provider API listening on port ${port}...`));
};

init();
