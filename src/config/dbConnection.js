 const mongoose = require("mongoose")

require("dotenv").config()

 const  dbconnect = process.env.DBSTRING

 const connectDB = async () => {
    try{
        console.log(`connecting to database......`)
        await mongoose.connect(dbconnect)
        console.log(`mongodb connected successfully`)
    } catch(error){
        console.log("error connecting to db", error.message)
        process.exit(1);

    }
    
 }

 module.exports = connectDB
