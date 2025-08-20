const User = require('./User');
const Expense = require('./expense');
const ForgotPasswordRequest = require('./forgot');


User.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ForgotPasswordRequest, { foreignKey: 'userId' });
ForgotPasswordRequest.belongsTo(User, { foreignKey: 'userId' });


module.exports = { User, Expense, ForgotPasswordRequest };
