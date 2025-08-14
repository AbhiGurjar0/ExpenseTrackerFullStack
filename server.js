const express = require('express');
const app = express();
const { registerUser, loginUser, logoutUser } = require('./controllers/authController');
const sequelize = require('./config/db');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 
const auth = require('./middlewares/auth')
const Expense = require('./models/expense');
const Income = require('./models/income');

app.set("view engine", "ejs");
app.use('/register', registerUser);
app.post('/login', loginUser);
app.use('/logout', logoutUser);
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/home", auth ,async (req, res) => {
  const expense = await Expense.findAll({ where: { userId: req.user.id.id } });
  const income = await Income.findAll({ where: { userId: req.user.id.id } });
  const totalIncome = income.reduce((acc, item) => acc + item.amount, 0);
  const totalExpense = expense.reduce((acc, item) => acc + item.amount, 0);
  const Balance = totalIncome-totalExpense;
  res.render("home", { expense, income, totalIncome, totalExpense, Balance });
});
app.post("/add", auth, async (req, res) => {
  console.log(req.user.id.id)
  let { val, amount, title } = req.body;
  if (val === 'expenses') {
    await Expense.create({ amount, title, userId: req.user.id.id })
      .then(() => res.redirect('/home'))
      .catch(err => console.error('Error adding expense', err));
  } else {
    await Income.create({ amount, title, userId: req.user.id.id })
      .then(() => res.redirect('/home'))
      .catch(err => console.error('Error adding income', err));
  }
  // console.log(val, amount, title);

})
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch((err) => console.error('Error syncing DB', err));
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});