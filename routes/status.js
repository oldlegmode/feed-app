const express = require('express');
const statusController = require('../controllers/status');
const isAuth = require('../middleware/auth');

const router = express.Router();

router.get('/status', isAuth, statusController.getStatus);
router.put('/status', isAuth, statusController.updateStatus);

module.exports = router;