import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 3000

if (!process.env.DB_URL) {
    throw new Error("DB_URL is not set. Add it to config.env.");
}

try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Database connection successful");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} catch (err) {
    console.error("Database connection failed:", err);
    process.exitCode = 1;
}