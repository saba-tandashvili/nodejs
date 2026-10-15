import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 3000

if (!process.env.DB_URL) {
    throw new Error("DB_URL is not set. Add it to config.env.");
}

if (!process.env.DB_USER || !process.env.DB_PASS) {
    throw new Error("DB_USER and DB_PASS must be set in config.env.");
}

const databaseUrl = new URL(process.env.DB_URL);
databaseUrl.username = process.env.DB_USER;
databaseUrl.password = process.env.DB_PASS;

try {
    await mongoose.connect(databaseUrl.toString());
    console.log("Database connection successful");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} catch (err) {
    console.error("Database connection failed:", err);
    process.exitCode = 1;
}