const express = require("express");
const app = express();
const auth = require("../middlewares/auth");
const Income = require("../models/income");
const User = require("../models/User");
const Expense = require("../models/expense");
const dotenv = require("dotenv");
dotenv.config();
const uuid = require("uuid");
const forgotPasswordRequest = require("../models/forgot");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const isPremium = require("../controllers/isPremium");
const payment = require("../models/payment");
const mongoose = require("mongoose");
const Transaction = require("../models/transaction");
const transaction = require("../models/transaction");
const { count } = require("console");
const { totalmem, type } = require("os");

//home

app.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id.id).populate("totalExpense");
    const incomes = await Transaction.find({
      userId: req.user.id.id,
      type: "income",
    });
    const expenses = await Expense.find({ userId: req.user.id.id });

    const totalIncome = incomes.reduce(
      (acc, item) => acc + Number(item.amount),
      0
    );
    const totalExpense = user.totalExpense || 0;
    const balance = totalIncome - totalExpense;

    const currentUser = await User.findOne({ _id: req.user.id.id });
    const transactions = await Transaction.find({ userId: req.user.id.id })
      .sort({ date: -1 })
      .limit(5);
    let yearlyReport = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().getFullYear(), 0, 1), // Jan 1 of current year
            $lt: new Date(new Date().getFullYear() + 1, 0, 1), // Jan 1 of next year
          },
          userId: new mongoose.Types.ObjectId(req.user.id.id),
          type: "expense",
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" } },
          totalAmount: { $sum: { $toDouble: "$amount" } },
        },
      },
      {
        $sort: { "_id.month": 1 }, // optional, sorts by month
      },
      {
        $group: {
          _id: null,
          months: { $push: { month: "$_id.month", amount: "$totalAmount" } },
          overAllMax: { $max: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          months: 1,
          overAllMax: 1,
        },
      },
    ]);

    let overAllMax = yearlyReport[0] ? yearlyReport[0].overAllMax : 0;
    let allHeights =
      yearlyReport[0]?.months?.map((val) => {
        return {
          month: val.month,
          height: (val.amount / overAllMax) * 100 || 0,
        };
      }) || [];
    // console.log(overAllMax);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const completeHeights = monthNames.map((m, idx) => {
      const found = allHeights.find((h) => {
        return h.month == idx + 1;
      });
      return { month: m, height: found ? found.height : 0 };
    });
    // console.log(completeHeights);

    res.render("home", {
      expense: expenses,
      income: incomes,
      totalIncome,
      totalExpense,
      Balance: balance,
      user: currentUser,
      transactions,
      completeHeights,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//transaction page
app.get("/transactions", auth, async (req, res) => {
  const transactions = await Transaction.find();
  let user = await User.findById(req.user.id.id);
  res.render("transaction", { transactions, user });
});

//daywise page
app.get("/dayWise", auth, isPremium, async (req, res) => {
  let user = await User.findById(req.user.id.id);
  res.render("dayWise", { user });
});

//leaderboard page
app.get("/leaderboard2", auth, async (req, res) => {
  let user = await User.findById(req.user.id.id);
  res.render("leaderboard2", { user });
});

//settings page
app.get("/settings", auth, async (req, res) => {
  let user = await User.findById(req.user.id.id);
  let Incomes = await Transaction.find({
    userId: req.user.id.id,
    type: "income",
  });

  let totalIncome = 0;
  Incomes.forEach((inc) => (totalIncome += Number(inc.amount)));

  res.render("settings", { user, totalIncome });
});

//add expense/income
app.post("/add", auth, async (req, res) => {
  let { type, amount, title, category, desc } = req.body;
  const session = await mongoose.startSession();
  // console.log("Adding transaction:", { val, amount, title, category, desc });

  try {
    session.startTransaction();

    if (type === "expense") {
      await Transaction.create(
        [
          {
            amount,
            title,
            category,
            desc,
            userId: req.user.id.id,
            type: "expense",
          },
        ],
        {
          session,
        }
      );
      await User.updateOne(
        { _id: req.user.id.id },
        { $inc: { totalExpense: amount } },
        { session }
      );
    } else {
      await Transaction.create(
        [
          {
            amount,
            title,
            category,
            desc,
            userId: req.user.id.id,
            type: "income",
          },
        ],
        {
          session,
        }
      );
    }
    await session.commitTransaction();
    console.log("successfully Added ");
    res.redirect("/");
  } catch (err) {
    await session.abortTransaction();
    console.error("Error adding transaction", err);
    res.status(500).send("Server error");
  }
});

//forgot pass page
app.get("/forgot", (req, res) => {
  res.render("forgot");
});

//forgot pass
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
      textContent: `Hello, You requested a password reset. The link for password reset is: ${process.env.FRONTEND_URL}/reset-password?uuid=${uuID}`,
    });
    await forgotPasswordRequest.create({
      id: uuID,
      userId: (await User.findOne({ email: email })).id,
      isActive: true,
    });

    res.send("Password reset mail sent successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending email");
  }
});

//reset pass page
app.get("/reset-password", async (req, res) => {
  const { uuid } = req.query;
  let curruuid = await forgotPasswordRequest.findOne({ id: uuid });
  if (curruuid.isActive) {
    res.render("reset", { uuid: curruuid.id });
  } else {
    return res.status(400).send("This link is expired");
  }
});

//reset pass
app.post("/reset-password", async (req, res) => {
  const { uuid, newPassword } = req.body;
  try {
    const forgotRequest = await forgotPasswordRequest.findOne({
      where: { id: uuid },
    });

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

//filter transaction
app.post("/filter", auth, async (req, res) => {
  let { filters, page } = req.body;
  let pageLimit = page[1] || 10;
  let pageNum = page[0] || 1;
  pageLimit = parseInt(pageLimit);
  pageNum = parseInt(pageNum);

  console.log(filters)
  let query = {};
  query.userId = req.user.id.id;
  if (filters.dateRange && filters.dateRange !== "any") {
    const today = new Date();
    let start, end;
    switch (filters.dateRange) {
      case "today": {
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
        break;
      }
      case "this_week": {
        const curr = new Date();
        const first = curr.getDate() - curr.getDay();
        start = new Date(curr.setDate(first));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      }
      case "this_month": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;
      }
      default:
        break;
    }
    if (start && end) query.date = { $gte: start, $lte: end };
  }
  if (filters.category && filters.category !== "all") {
    query.category = filters.category;
  }
  if (filters.transactionType && filters.transactionType !== "all") {
    query.type = filters.transactionType;
  }
  if (filters.amountRange && filters.amountRange !== "any") {
    const [min, max] = filters.amountRange.split("_").map(Number);
    query.amount = { $gte: min, $lte: max };
    console.log([min,max])
  }

  const totalDocs = await Transaction.countDocuments(query);

  const filteredTransactions = await Transaction.find(query)
    .skip((pageNum - 1) * pageLimit)
    .limit(pageLimit)
    .sort({ date: -1 });

  res.json({
    success: true,
    count: totalDocs,
    data: filteredTransactions,
  });
});

//edit expense/income page
app.get("/edit/:id", auth, async (req, res) => {
  let expenseId = req.params.id;
  let transaction = await Transaction.findById(expenseId);
  res.render("edit", { transaction });
});
// edit expense/income
app.post("/update/:id", auth, async (req, res) => {
  let { amount, date, type, category, desc, title } = req.body;
  let transaction = await Transaction.findById(req.params.id);
  let expChange = amount - transaction.amount;
  await Transaction.findByIdAndUpdate(
    req.params.id,
    {
      type,
      amount,
      category,
      desc,
      title,
      date,
    },
    {
      new: true,
    }
  );
  if (transaction.type == "expense") {
    await User.findByIdAndUpdate(req.user.id.id, {
      $inc: { totalExpense: expChange },
    });
  }
  res.redirect("/transactions");
});

//leaderboard
app.post("/leaderboard/data", auth, async (req, res) => {
  console.log("Leaderboard data request received");
  let { page } = req.body;
  let pageLimit = page[1] || 10;
  let pageNum = page[0] || 1;
  pageLimit = parseInt(pageLimit);
  pageNum = parseInt(pageNum);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const endOfYear = new Date(new Date().getFullYear() + 1, 0, 1);

  const result = await Transaction.aggregate([
    // 1️⃣ Match current year's transactions
    {
      $match: {
        date: { $gte: startOfYear, $lt: endOfYear },
      },
    },
    // Group by userId to get totals
    {
      $group: {
        _id: "$userId",

        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, { $toDouble: "$amount" }, 0],
          },
        },
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, { $toDouble: "$amount" }, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        userName: "$userDetails.userName", // matching User schema
        totalExpense: 1,
        totalIncome: 1,
      },
    },
    {
      $addFields: {
        savingRate: {
          $cond: [
            { $eq: ["$totalIncome", 0] },
            0,
            {
              $divide: [
                { $subtract: ["$totalIncome", "$totalExpense"] },
                "$totalIncome",
              ],
            },
          ],
        },
      },
    },
    // Sort by saving rate descending
    {
      $sort: { savingRate: -1 },
    },
    {
      $skip: (pageNum - 1) * pageLimit,
    },
    {
      $limit: pageLimit,
    },
  ]);

  const totalUsers = await Transaction.aggregate([
    { $match: { date: { $gte: startOfYear, $lt: endOfYear } } },
    { $group: { _id: "$userId" } }, // group by userId
    { $count: "total" }, // count unique users
  ]);

  const totalCount = totalUsers[0] ? totalUsers[0].total : 0;

  res.json({
    user: req.user,
    count: totalCount,
    users: result,
    startRank: (pageNum - 1) * pageLimit,
  });
});

//daily transaction
app.post("/api/transactions", auth, async (req, res) => {
  let { date } = req.body;
  date = new Date(date);
  // console.log("Request body:", new Date(date));
  let transactions = await Transaction.find({
    date: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999)),
    },
    userId: req.user.id.id,
  });
  let totalIncome = 0;
  let totalExpense = 0;
  let netAmount = 0;
  let transLength = 0;
  transactions.forEach((t) => {
    if (t.type == "income") totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  });
  netAmount = totalIncome - totalExpense;
  transLength = transactions.length;

  res.json({
    message: "Success",
    transactions,
    totalIncome,
    totalExpense,
    netAmount,
    transLength,
  });
});
//delete expense/income
app.post("/delete/:id", auth, async (req, res) => {
  console.log("Delete request for ID:", req.params.id);
  const id = req.params.id;
  try {
    const transaction = await Transaction.findByIdAndDelete(id);
    const amountToDecrement =
      transaction && transaction.amount ? transaction.amount : 0;

    await User.findByIdAndUpdate(req.user.id.id, {
      $inc: { totalExpense: -amountToDecrement },
    });

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
async function generateReports(userId) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  let daywiseExp = await Transaction.find({
    userId: userId,
    date: {
      $gte: startDate,
    },
    type: "expense",
  });

  let daywiseIncome = await Transaction.find({
    userId: userId,
    date: {
      $gte: startDate,
    },
    type: "income",
  });
  const currentYear = new Date().getFullYear();
  const expenses = await Transaction.find({
    userId: userId,
    date: {
      $gt: new Date(currentYear, 0, 1),
      $lte: new Date(currentYear, 11, 31, 23, 59, 59),
    },

    type: "expense",
  });
  let monthlyExpense = Array(12).fill(0);
  expenses.forEach((exp) => {
    const month = exp.date?.getMonth();
    if (month !== undefined) {
      monthlyExpense[month] += exp.amount;
    }
  });
  const incomes = await Transaction.find({
    userId: userId,
    date: {
     $gt: new Date(currentYear, 0, 1),
      $lte: new Date(currentYear, 11, 31, 23, 59, 59),
    },
    type: "income",
  });
  let monthlyIncome = Array(12).fill(0);
  incomes.forEach((exp) => {
    const month = exp.date?.getMonth();
    if (month !== undefined) {
      monthlyIncome[month] += exp.amount;
    }
  });
  const monthlyReport = Array.from({ length: 12 }, (_, i) => {
    return {
      month: new Date(currentYear, i).toLocaleString("default", {
        month: "long",
      }),
      income: monthlyIncome[i],
      expense: monthlyExpense[i],
      savings: monthlyIncome[i] - monthlyExpense[i],
    };
  });
  return { daywiseExp, daywiseIncome, monthlyReport };
}

app.get("/api/report", auth, isPremium, async (req, res) => {
  const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(
    req.user.id.id
  );

  res.json({ daywiseExp, daywiseIncome, monthlyReport });
});

app.get("/report", auth, isPremium, async (req, res) => {
  const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(
    req.user.id.id
  );
  res.render("report", { daywiseExp, daywiseIncome, monthlyReport });
});

app.get("/download-report", auth, isPremium, async (req, res) => {
  try {
    const { daywiseExp, daywiseIncome, monthlyReport } = await generateReports(
      req.user.id.id
    );
    
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    doc.pipe(res);

    doc
      .fontSize(22)
      .fillColor("#2563eb")
      .text(" Expense & Income Report", { align: "center" })
      .moveDown(2);

    doc
      .fontSize(18)
      .fillColor("#16a34a")
      .text(" Yearly Report", { underline: true })
      .moveDown(1);
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
      doc.rect(doc.x, doc.y, 500, 20).fill(bg).stroke();

      doc
        .fillColor("black")
        .text(row.month, doc.x + 5, doc.y + 5, { continued: true, width: 120 })
        .text(row.income, doc.x + 100, doc.y + 5, {
          continued: true,
          width: 120,
        })
        .text(row.expense, doc.x + 210, doc.y + 5, {
          continued: true,
          width: 120,
        })
        .text(row.savings, doc.x + 300, doc.y + 5);
      doc.moveDown(0.5);
    });
    doc.addPage();
    doc
      .fontSize(18)
      .fillColor("#dc2626")
      .text("Daily Report (Previous Month)", { underline: true })
      .moveDown(1);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    let daysInPrevMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0
    ).getDate();

    let dailyReport = Array.from({ length: daysInPrevMonth }, (_, i) => ({
      day: i + 1,
      income: 0,
      expense: 0,
      savings: 0,
    }));

    daywiseExp.forEach((exp) => {
      let day = exp.date?.getDate();
      if (day) dailyReport[day - 1].expense += exp.amount;
    });
    daywiseIncome.forEach((inc) => {
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
      doc.rect(doc.x, doc.y, 500, 20).fill(bg).stroke();

      doc
        .fillColor("black")
        .text(`Day ${row.day}`, doc.x + 5, doc.y + 5, {
          continued: true,
          width: 120,
        })
        .text(row.income, doc.x + 130, doc.y + 5, {
          continued: true,
          width: 120,
        })
        .text(row.expense, doc.x + 260, doc.y + 5, {
          continued: true,
          width: 120,
        })
        .text(row.savings, doc.x + 390, doc.y + 5);
      doc.moveDown(0.5);
    });

    doc.end();
  
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating PDF");
  }
});
app.get("/dailyReport", auth, isPremium, (req, res) => {
  res.render("daily");
});

module.exports = app;
