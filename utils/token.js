const jwt = require('jsonwebtoken');

exports.generateToken = (email, password) => {
    const token = jwt.sign({ email, password }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return token;
};
