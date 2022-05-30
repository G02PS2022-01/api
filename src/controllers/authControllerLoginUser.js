const express = require("express");
const bcrypt = require('bcryptjs');
const User = require("../models/User");

const router = express.Router();

router.get("/loginUser", async(req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('password');

    if(!user)
        return res.status(400).send({ error: 'User not found' });

    if(!await bcrypt.compare(password, user.password)){
        return res.status(400).send({ error: 'Invalid password' })
    }else{
        return res.status(200)
    }

});

module.exports = (app) => app.use("/auth", router);