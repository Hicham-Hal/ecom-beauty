import mongoose, { mongo } from "mongoose";
import { configDotenv } from "dotenv";

configDotenv()

export async function connectDb(){
    const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.kicuudo.mongodb.net/`
    try{
        await mongoose.connect(uri)
        console.log('DB connected')
    }catch(err){
        console.log(err)
    }
}