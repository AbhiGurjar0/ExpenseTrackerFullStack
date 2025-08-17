// const express = require('express');
const { Cashfree, CFEnvironment } = require("cashfree-pg");

const cashfree = new Cashfree(CFEnvironment.SANDBOX, "TEST430329ae80e0f32e41a393d78b923034", "TESTaf195616268bd6202eeb3bf8dc458956e7192a85");
cashfree.XApiVersion = "2022-09-01";
exports.createOrder = async (
    order_amount,
    order_id,
    customer_id,
    customer_phone,

) => {
    const expiry = new Date(Date.now() + 25 * 60 * 1000);
    const formatedExpiry = expiry.toISOString();
    const request = {
        order_amount: order_amount,
        order_currency: "INR",
        order_id: order_id,
        customer_details: {
            customer_id: customer_id,
            customer_phone: customer_phone,
            customer_email: "customer@example.com"
        },
        order_meta: {
            return_url: `http://localhost:3000/pay/order-status/${order_id}`,
            // notify_url: "http://localhost:3000/webhooks/" + order_id,
            payment_methods: "cc,dc,upi"
        },
        order_expiry_time: formatedExpiry,
    };
    const response = await cashfree.PGCreateOrder(request);
    return response.data.payment_session_id;
}

exports.getPaymentStatus = async (orderId) => {

    let response = await cashfree.PGOrderFetchPayments(orderId);

    let getOrderResponse = response.data;
    let orderStatus;

    if (getOrderResponse.filter(transaction => transaction.payment_status === "SUCCESS").length > 0) {
        orderStatus = "Success"
    } else if (getOrderResponse.filter(transaction => transaction.payment_status === "PENDING").length > 0) {
        orderStatus = "Pending"
    } else {
        orderStatus = "Failure"
    }
    return orderStatus;
}