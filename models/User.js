const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isPremium: { type: Boolean, default: false },
    totalExpense: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
