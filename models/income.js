const mongoose = require('mongoose');
const { Schema } = mongoose;

const IncomeSchema = new Schema({
    amount: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        trim: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User', // adjust to your User model name
    },
});

module.exports = mongoose.model('Income', IncomeSchema);
