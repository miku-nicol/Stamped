const express = require("express");
 
const passport = require("passport");
const connectDB = require("./src/config/dbConnection");
const userRouter = require("./src/modules/users/userRoutes");
const { configure } = require("./src/modules/users/userPassport");
const app= express()
app.use(express.json())
require('dotenv').config();

//Session middleware (required for Passport)
 

// Initialize Passport
app.use(passport.initialize());
 

configure();

app.use("/api/v1/auth", userRouter);

app.get("/", (req, res) =>{
    res.end("The begining of stamp")
})

 

connectDB()
const PORT= process.env.PORT || 9000

app.listen(PORT, () =>{
    console.log(`server running on http://localhost:${PORT}`)
})