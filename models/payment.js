const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId: { type: String, required: true },
    paymentSessionId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    orderCurrency: { type: String, trim: true },
    paymentStatus: { type: String, required: true, trim: true },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
