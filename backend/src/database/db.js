import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: DB_NAME 
        });
        console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); 
    }
};