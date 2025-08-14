const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');
const User = sequelize.define('User', {
    userName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false,
});
module.exports = User;