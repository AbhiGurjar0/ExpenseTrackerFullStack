const Sequelize = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();
const sequelize = new Sequelize('expense_db', 'root', `${process.env.DB_PASSWORD}`, {
    host: 'localhost',
    dialect: "mysql",
    logging: false,
});

module.exports = sequelize;