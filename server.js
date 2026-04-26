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

const allowedOrigins = [
  "http://localhost:3000",
  "https://stamped-flutter-app.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  exposedHeaders: ["Authorization"],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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