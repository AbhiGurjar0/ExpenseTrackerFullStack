const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
let conection = mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));
module.exports = conection;
