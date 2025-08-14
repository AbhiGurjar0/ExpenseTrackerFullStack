const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { generateToken } = require('../utils/token')
exports.registerUser = async (req, res) => {
    let { userName, email, password } = req.body;
    if (!userName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    let user = await User.findByPk(email);
    if (user) {
        return res.status(400).json({ message: 'User already exists' });
    }
    let pass = await bcrypt.hash(password, 10);
    await User.create({ userName, email: email.toLowerCase(), password: pass });

    return res.status(201).json({ message: 'User registered successfully' });
};

exports.loginUser = async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    let user = await User.findByPk(email);
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    let pass = await bcrypt.compare(password, user.password);
    if (!pass) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    let token = generateToken(email, password)
    res.cookie('token', token, { httpOnly: true });
    return res.redirect('/home');
};
exports.logoutUser = async (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
};


