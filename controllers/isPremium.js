const express = require('express');
const User = require('../models/User');


const isPremium = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id.id);
        if (!user) return res.status(404).send("User not found");
        if(user.isPremium) {
            next();
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error("Error checking premium status:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = isPremium;