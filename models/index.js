const User = require('./User');
const Expense = require('./expense');


User.hasMany(Expense, { foreignKey: 'userId' });


Expense.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, Expense };
