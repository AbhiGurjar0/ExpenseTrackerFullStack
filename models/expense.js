const mongoose = require("mongoose");

let expenseSchema = mongoose.Schema({
  amount: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  notes: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref:"User",
  },
});

module.exports = mongoose.model("Expense", expenseSchema);
