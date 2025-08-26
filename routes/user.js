const express = require('express');
const app = express();
const auth = require('../middlewares/auth')
const expense = require('../models/expense');
const Income = require('../models/income');
const user = require('../models/User');
const sequelize = require('../config/db');
const { User, Expense, ForgotPasswordRequest } = require('../models/index');
const dotenv = require('dotenv');
dotenv.config();
const uuid = require('uuid');
const forgotPasswordRequest = require('../models/forgot')
const SibApiV3Sdk = require("sib-api-v3-sdk");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const isPremium = require('../controllers/isPremium');
const payment = require('../models/payment')


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
            user: currentUser,

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
            where: {
            isPremium: true,
            totalExpense: { [Op.not]: null }
            },
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

app.get("/leaderboard", auth, isPremium, async (req, res) => {
    const result = await getUsersWithExpenses();
    result.sort((a, b) => b.totalExpense - a.totalExpense);
    res.render("leaderboard", { user: req.user, users: result });
});

app.post('/delete/:id', auth, async (req, res) => {
    const id = req.params.id;
    try {
      
        const exp = await expense.findOne({ where: { id, userId: req.user.id.id } });
        const amountToDecrement = exp && exp.amount ? exp.amount : 0;
        await expense.destroy({ where: { id, userId: req.user.id.id } });
        await Income.destroy({ where: { id, userId: req.user.id.id } });
        await User.decrement({ totalExpense: amountToDecrement }, { where: { id: req.user.id.id } });
        // await User.save();
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
async function generateReports(userId) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    let daywiseExp = await expense.findAll({
        where: {
            userId: userId,
            date: {
                [Op.gte]: startDate,
            }
        }
    });

    let daywiseIncome = await Income.findAll({
        where: {
            userId: userId,
            date: {
                [Op.gte]: startDate,
            }
        }
    });
    const currentYear = new Date().getFullYear();
    const expenses = await expense.findAll({
        where: {
            userId: userId,
            date: {
                [Op.gte]: new Date(currentYear, 0, 1),
                [Op.lte]: new Date(currentYear, 11, 31, 23, 59, 59)
            }
        }
    });
    let monthlyExpense = Array(12).fill(0);
    expenses.forEach(exp => {
        const month = exp.date?.getMonth();
        if (month !== undefined) {
            monthlyExpense[month] += exp.amount;
        }
    });
    const incomes = await Income.findAll({
        where: {
            userId: userId,
            date: {
                [Op.gte]: new Date(currentYear, 0, 1),
                [Op.lte]: new Date(currentYear, 11, 31, 23, 59, 59)
            }
        }
    });
    let monthlyIncome = Array(12).fill(0);
    incomes.forEach(exp => {
        const month = exp.date?.getMonth();
        if (month !== undefined) {
            monthlyIncome[month] += exp.amount;
        }
    });
    const monthlyReport = Array.from({ length: 12 }, (_, i) => {
        return {
            month: new Date(currentYear, i).toLocaleString("default", { month: "long" }),
            income: monthlyIncome[i],
            expense: monthlyExpense[i],
            savings: monthlyIncome[i] - monthlyExpense[i]
        };
    });
    return ({ daywiseExp, daywiseIncome, monthlyReport });

}

app.get('/api/report', auth, isPremium, async (req, res) => {
    const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(req.user.id.id);

    res.json({ daywiseExp, daywiseIncome, monthlyReport });
});

app.get('/report', auth, isPremium, async (req, res) => {
    const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(req.user.id.id);
    res.render("report", { daywiseExp, daywiseIncome, monthlyReport });
})


app.get("/download-report", auth, isPremium, async (req, res) => {
    try {
        const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(req.user.id.id);
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
        doc.pipe(res);

        doc
            .fontSize(22)
            .fillColor("#2563eb")
            .text(" Expense & Income Report", { align: "center" })
            .moveDown(2);


        doc.fontSize(18).fillColor("#16a34a").text(" Yearly Report", { underline: true }).moveDown(1);
        doc
            .fontSize(12)
            .fillColor("white")
            .rect(doc.x, doc.y, 600, 20)
            .fill("#2563eb")
            .stroke()
            .fillColor("white")
            .text("Month", doc.x + 5, doc.y + 5, { continued: true, width: 120 })
            .text("Income", doc.x + 120, doc.y + 5, { continued: true, width: 120 })
            .text("Expense", doc.x + 220, doc.y + 5, { continued: true, width: 120 })
            .text("Savings", doc.x + 300, doc.y + 5);


        doc.moveDown(1).fillColor("black");


        monthlyReport.forEach((row, idx) => {
            const bg = idx % 2 === 0 ? "#f1f5f9" : "#ffffff";
            doc
                .rect(doc.x, doc.y, 500, 20)
                .fill(bg)
                .stroke();

            doc
                .fillColor("black")
                .text(row.month, doc.x + 5, doc.y + 5, { continued: true, width: 120 })
                .text(row.income, doc.x + 100, doc.y + 5, { continued: true, width: 120 })
                .text(row.expense, doc.x + 210, doc.y + 5, { continued: true, width: 120 })
                .text(row.savings, doc.x + 300, doc.y + 5);
            doc.moveDown(0.5);
        });
        doc.addPage();
        doc.fontSize(18).fillColor("#dc2626").text("Daily Report (Previous Month)", { underline: true }).moveDown(1);

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        let daysInPrevMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

        let dailyReport = Array.from({ length: daysInPrevMonth }, (_, i) => ({
            day: i + 1,
            income: 0,
            expense: 0,
            savings: 0
        }));

        daywiseExp.forEach(exp => {
            let day = exp.date?.getDate();
            if (day) dailyReport[day - 1].expense += exp.amount;
        });
        daywiseIncome.forEach(inc => {
            let day = inc.date?.getDate();
            if (day) dailyReport[day - 1].income += inc.amount;
        });


        doc
            .fontSize(12)
            .fillColor("white")
            .rect(doc.x, doc.y, 500, 20)
            .fill("#dc2626")
            .stroke()
            .fillColor("white")
            .text("Day", doc.x + 5, doc.y + 5, { continued: true, width: 120 })
            .text("Income", doc.x + 130, doc.y + 5, { continued: true, width: 120 })
            .text("Expense", doc.x + 260, doc.y + 5, { continued: true, width: 120 })
            .text("Savings", doc.x + 390, doc.y + 5);

        doc.moveDown(1).fillColor("black");


        dailyReport.forEach((row, idx) => {
            const bg = idx % 2 === 0 ? "#fef2f2" : "#ffffff";
            doc
                .rect(doc.x, doc.y, 500, 20)
                .fill(bg)
                .stroke();

            doc
                .fillColor("black")
                .text(`Day ${row.day}`, doc.x + 5, doc.y + 5, { continued: true, width: 120 })
                .text(row.income, doc.x + 130, doc.y + 5, { continued: true, width: 120 })
                .text(row.expense, doc.x + 260, doc.y + 5, { continued: true, width: 120 })
                .text(row.savings, doc.x + 390, doc.y + 5);
            doc.moveDown(0.5);
        });

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).send("Error generating PDF");
    }
});
app.get('/dailyReport', auth, isPremium, (req, res) => {
    res.render('daily');
});

module.exports = app;