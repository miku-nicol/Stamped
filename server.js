require('dotenv').config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./src/config/dbConnection");
const userRouter = require("./src/modules/users/userRoutes");
const { configure } = require("./src/modules/users/userPassport");
const swaggerDocument = YAML.load("./swagger.yaml");
const app= express()

 app.use(cors());
app.use(express.json())



 


// Initialize Passport
app.use(passport.initialize());
 

configure();

app.use("/api/v1/auth", userRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/", (req, res) =>{
    res.end("The begining of stamp")
})

 

connectDB()
const PORT= process.env.PORT || 9000

app.listen(PORT, () =>{
console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Swagger docs: /api-docs`);
})