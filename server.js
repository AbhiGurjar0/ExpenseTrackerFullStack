const express = require('express');
const app = express();
const { registerUser, loginUser, logoutUser } = require('./controllers/authController');
const sequelize = require('./config/db');
const dotenv = require('dotenv');
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use('/register', registerUser);
app.post('/login', loginUser);
app.use('/logout', logoutUser);
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/home", (req, res) => {
  res.render("home");
});
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch((err) => console.error('Error syncing DB', err));
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});