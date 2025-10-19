const Payment = require('../models/payment');
const { createOrder, getPaymentStatus } = require('../services/cashfreeServices');
const User = require('../models/User')
exports.processPayment = async (req, res) => {
    const order_amount = "2000";
    const order_id = "order_" + Date.now();
    const customer_id = "devstudio_user";
    const customer_phone = "9876543210";


    try {
        const paymentSessionId = await createOrder(
            order_amount,
            order_id,
            customer_id,
            customer_phone
        );

        await Payment.create({
            orderId: order_id,
            paymentSessionId: paymentSessionId,
            amount: order_amount,
            orderCurrency: "INR",
            paymentStatus: "PENDING"
        });
        res.status(200).json({ paymentSessionId, order_id });
    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ error: "Payment processing failed" });
    }
};

exports.getPaymentStatus = async (req, res) => {
    const { orderId } = req.params;

    try {
        const status = await getPaymentStatus(orderId);
        await Payment.update(
            { paymentStatus: status },
            { where: { orderId } }
        );
        if (status === "Success") {
            const user = await User.findOne({ where: { id: req.user.id.id } });
            user.isPremium = true;
            await user.save();
        }

        res.redirect('/');
    } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({ error: "Failed to fetch payment status" });
    }
};