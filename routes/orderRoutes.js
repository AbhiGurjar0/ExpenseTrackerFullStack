const express = require('express');
const { processPayment, getPaymentStatus } = require('../controllers/paymentController');
const router = express.Router();
const  auth  = require('../middlewares/auth');

router.post('/',auth ,processPayment);
router.get('/order-status/:orderId', auth, getPaymentStatus);

module.exports = router;
