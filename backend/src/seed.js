import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './database/db.js';
import { Dispatcher } from './models/dispatcher.model.js'; 

dotenv.config();

const createInitialAdmin = async () => {
    try {
        // 1. Connect to MongoDB
        await connectDB();
        console.log("Connected to database. Attempting to create admin...");

        // 2. Check if admin already exists to prevent duplicates
        const existingAdmin = await Dispatcher.findOne({ email: 'admin@fieldpulse.com' });
        if (existingAdmin) {
            console.log("⚠️ Admin account already exists!");
            process.exit(0);
        }

        // 3. Create the new account
        const adminAccount = new Dispatcher({
            email: 'admin@fieldpulse.com',
            password: 'SecurePassword123!' // Your pre-save hook will automatically hash this!
        });

        await adminAccount.save();
        console.log("✅ Success! Admin Dispatcher account created.");

    } catch (error) {
        console.error("❌ Error creating account:", error.message);
    } finally {
        // 4. Disconnect from the database so the script finishes and exits
        mongoose.disconnect();
        process.exit(0);
    }
};

createInitialAdmin();