const express = require('express');
const app = express();
const auth = require('../middlewares/auth')
const expense = require('../models/expense');
const Income = require('../models/income');
const user = require('../models/User');
const sequelize = require('../config/db');
const { User, Expense } = require('../models/index');
app.get("/", auth, async (req, res) => {
    try {
        const expenses = await Expense.findAll({ where: { userId: req.user.id.id } });
        const incomes = await Income.findAll({ where: { userId: req.user.id.id } });

        const totalIncome = incomes.reduce((acc, item) => acc + item.amount, 0);
        const totalExpense = expenses.reduce((acc, item) => acc + item.amount, 0);
        const balance = totalIncome - totalExpense;

        const currentUser = await User.findOne({ where: { id: req.user.id.id } });

        res.render("home", {
            expense: expenses,
            income: incomes,
            totalIncome,
            totalExpense,
            Balance: balance,
            user: currentUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/add", auth, async (req, res) => {

    let { val, amount, title } = req.body;
    const t = await sequelize.transaction();
    try {
        if (val === 'expense') {
            await Expense.create({ amount, title, userId: req.user.id.id }, { transaction: t });
            await User.increment({ totalExpense: amount }, { where: { id: req.user.id.id }, transaction: t });
        } else {
            await Income.create({ amount, title, userId: req.user.id.id }, { transaction: t });
        }
        await t.commit();
        res.redirect('/');
    } catch (err) {
        await t.rollback();
        console.error('Error adding transaction', err);
        res.status(500).send("Server error");
    }

});


const getUsersWithExpenses = async () => {
    try {
        const expenses = await user.findAll({
            attributes: [
                'userName',
                'totalExpense'
            ],
            where: { isPremium: true },
            group: ['id']
        });


        return expenses.map(exp => ({
            userName: exp.userName,
            totalExpense: exp.totalExpense
        }));
    } catch (err) {
        console.error(err);
    }
};

app.get("/leaderboard", auth, async (req, res) => {
    const result = await getUsersWithExpenses();
    // console.log(result)
    result.sort((a, b) => b.totalExpense - a.totalExpense);
    res.render("leaderboard", { user: req.user, users: result });
});

app.post('/delete', auth, async (req, res) => {
    const { id } = req.body;
    try {
        await expense.destroy({ where: { id, userId: req.user.id.id } });
        await Income.destroy({ where: { id, userId: req.user.id.id } });
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = app;