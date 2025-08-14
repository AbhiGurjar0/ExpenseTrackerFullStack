const express = require('express');
const app = express();
const auth = require('../middlewares/auth')
const Expense = require('../models/expense');
const Income = require('../models/income');
app.get("/", auth, async (req, res) => {
    const expense = await Expense.findAll({ where: { userId: req.user.id.id } });
    const income = await Income.findAll({ where: { userId: req.user.id.id } });
    const totalIncome = income.reduce((acc, item) => acc + item.amount, 0);
    const totalExpense = expense.reduce((acc, item) => acc + item.amount, 0);
    const Balance = totalIncome - totalExpense;
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

})
app.post('/delete', auth, async (req, res) => {
    const { id } = req.body;
    try {
        await Expense.destroy({ where: { id, userId: req.user.id.id } });
        await Income.destroy({ where: { id, userId: req.user.id.id } });
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = app;