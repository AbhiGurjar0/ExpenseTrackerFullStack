const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

module.exports = sequelize.define('Expense', {
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        trim: true,
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    notes: {
        type: DataTypes.STRING,
        trim: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
}, {
    tableName: 'expenses',
    timestamps: false,
});