const express = require('express');
const app = express();
const auth = require('../middlewares/auth')
const expense = require('../models/expense');
const Income = require('../models/income');
const user = require('../models/User');
const sequelize = require('../config/db');
const { User, Expense,ForgotPasswordRequest} = require('../models/index');
const dotenv = require('dotenv');
dotenv.config();
const uuid = require('uuid');
const forgotPasswordRequest = require('../models/forgot')
const SibApiV3Sdk = require("sib-api-v3-sdk");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();


app.get('/forgot', (req, res) => {
    res.render("forgot");
});

app.post("/password/forgotpassword", async (req, res) => {
    const { email } = req.body;

    try {
        const sender = { email: "abhishekbainsla190@gmail.com" };
        const receivers = [{ email }];
        let uuID = uuid.v4();
        await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject: "Password Reset Request",
            textContent: `Hello, You requested a password reset. The link for password reset is: ${process.env.FRONTEND_URL}/reset-password?uuid=${uuID}`
        });
        await forgotPasswordRequest.create({
            id: uuID,
            userId: (await User.findOne({ where: { email } })).id,
            isActive: true,
        });

        res.send("Password reset mail sent successfully!");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error sending email");
    }
});
app.get('/reset-password', async (req, res) => {
    const { uuid } = req.query;
    let curruuid = await forgotPasswordRequest.findByPk(uuid);
    if (curruuid.isActive) {
        res.render("reset", { uuid: curruuid.id });
    }
    else {
        return res.status(400).send("This link is expired");

    }
});
app.post('/reset-password', async (req, res) => {
    const { uuid, newPassword } = req.body;
    try {
        const forgotRequest = await forgotPasswordRequest.findOne({ where: { id: uuid } });

        if (!forgotRequest || !forgotRequest.isActive) {
            return res.status(400).send("Invalid or expired reset link");
        }

        let pass = await bcrypt.hash(newPassword, 10);
        const user = await User.findOne({ where: { id: forgotRequest.userId } });

        user.password = pass;
        await user.save();

        forgotRequest.isActive = false;
        await forgotRequest.save();

        res.send("Password reset successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error resetting password");
    }
});

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