const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
    orderId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    paymentSessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        trim: true,
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    orderCurrency: {
        type: DataTypes.STRING,
        trim: true,
    },
    paymentStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        trim: true,
    }

}, {
    tableName: 'payments',
    timestamps: false,
});

module.exports = Payment;