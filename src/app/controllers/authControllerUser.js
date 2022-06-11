const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth");
const crypto = require("crypto");

const User = require("../models/User");

const router = express.Router();

const mailer = require("../../modules/mailer");

function generateToken(params) {
  return jwt.sign(params, authConfig.secret, {
    expiresIn: 86400,
  });
}

router.post("/register", async (req, res) => {
  const { email } = req.body;

  try {
    if (await User.findOne({ email }))
      return res.status(400).send({ erro: "User already exists" });

    const user = await User.create(req.body);

    user.password = undefined;

    return res.send({
      user,
      token: generateToken({ id: user.id }),
    });
  } catch (err) {
    return res.status(400).send({ error: "Registration failed" });
  }
});

router.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) return res.status(400).send({ erro: "User not found" });

  if (!(await bcrypt.compare(password, user.password)))
    return res.status(400).send({ erro: "Password mismatch" });

  user.password = undefined;

  res.send({
    user,
    token: generateToken({ id: user.id }),
  });
});

router.post("/forgot_password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).send({ error: "User not found" });

    const token = crypto.randomBytes(20).toString("hex");

    const now = new Date();

    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: now,
      },
    });

    /*router.post("/reset_password", async (req, res) => {
      const { email, token, password } = req.body;

      try {
        const user = await User.finOne({ email }).select(
          "+passwordResetToken passwordResetExpires"
        );

        if (!user) return res.status(400).send({ error: "User not found" });

        if (token !== user.passwordResetToken)
          return res.status(400).send({ error: "Token invalid" });

        const now = new Date();

        if (now > user.passwordResetExpires)
          return res
            .status(400)
            .send({ error: "Token expired, generate a new one" });

        user.password = password;

        await user.save();
        res.send();
      } catch (err) {
        res.status(400).send({ error: "Cannot reset password, try again" });
      }
    }); */

    mailer.sendMail(
      {
        to: email,
        from: "amaur1mmj@gmail.com",
        template: "auth/forgot_password",
        context: { token },
      },
      (err) => {
        if (err) {
          console.log(err);
          return res
            .status(400)
            .send({ error: "Cannot send forgot password email" });
        }

        return res.send();
      }
    );

    console.log(token, now);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Erro on forgot password, try again" });
  }
});

module.exports = (app) => app.use("/auth", router);