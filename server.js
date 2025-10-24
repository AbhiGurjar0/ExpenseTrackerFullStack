const express = require("express");
const app = express();
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("./controllers/authController");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const routes = require("./routes/user");
const path = require("path");
const mongoose = require("mongoose");
const db = require("./config/db");

dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const auth = require("./middlewares/auth");
const Expense = require("./models/expense");
const Income = require("./models/income");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const fs = require("fs");
const cors = require("cors");

let logfile = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});
// app.use(helmet());
app.use(morgan("combined", { stream: logfile }));
app.use(compression());
app.use(cors());
app.set("view engine", "ejs");
app.use("/register", registerUser);
app.post("/login", loginUser);
app.use("/logout", logoutUser);
app.get("/login", (req, res) => {
  res.render("login");
});
app.use("/", routes);
app.use("/pay", require("./routes/orderRoutes"));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
