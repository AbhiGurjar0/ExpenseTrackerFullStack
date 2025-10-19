const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ForgotPasswordRequestSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
        unique: true,
    },
    userId: {
        type: Number,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

module.exports = mongoose.model('ForgotPasswordRequest', ForgotPasswordRequestSchema);
