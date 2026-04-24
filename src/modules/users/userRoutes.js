const express = require("express");
const { register, login, googleMobileAuth, googleCallback, forgotPassword, validateResetToken, resetPassword } = require("./userController");
const passport = require("passport");


const userRouter= express.Router();
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/auth/google-mobile", googleMobileAuth);
userRouter.get(
  "/auth/google",
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
userRouter.get("/auth/google/callback", passport.authenticate('google', { session: false }), googleCallback)
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/validate-reset-token/:token", validateResetToken)


module.exports = userRouter;