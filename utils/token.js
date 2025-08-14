const jwt = require('jsonwebtoken');

exports.generateToken = (id, email) => {
    const token = jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return token;
};
