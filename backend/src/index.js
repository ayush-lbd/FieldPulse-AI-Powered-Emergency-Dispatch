import 'dotenv/config';
import { connectDB } from './database/db.js';
import { app } from './app.js';

const PORT = process.env.PORT || 3000;

// Connect to MongoDB, then start the server
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed !!! ", err);
    });