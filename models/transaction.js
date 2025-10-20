const mongoose = require("mongoose");

let transactionSchema = mongoose.Schema({
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
  desc: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  type: {
    type: String,
    enum: ["expense", "income"],
    default: "expense",
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
