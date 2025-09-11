const Sequelize = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // needed for Render SSL
        },
    },
});

sequelize.authenticate()
    .then(() => console.log("✅ Connected to Render PostgreSQL"))
    .catch(err => console.error("❌ Connection failed:", err));



module.exports = sequelize;