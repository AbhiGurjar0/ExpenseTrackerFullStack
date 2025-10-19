const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ForgotPasswordRequest = sequelize.define("ForgotPasswordRequest", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
},
{
    timestamps: false,
});

module.exports = ForgotPasswordRequest;
