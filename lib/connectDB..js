import mongoose, { mongo } from "mongoose";
import { configDotenv } from "dotenv";

configDotenv()

export const mongoURI = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.kicuudo.mongodb.net/`
export async function connectDb(){
    try{
        await mongoose.connect(mongoURI)
        console.log('DB connected')
    }catch(err){
        console.log(err)
    }
}
