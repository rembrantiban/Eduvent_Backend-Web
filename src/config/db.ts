import mongoose from "mongoose";
import dotenv from "dotenv";
import { Location } from "../modules/Location/location.Model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;
if (!MONGO_URI) {
  throw new Error("MONGO_URL is not defined in .env");
}

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected Successfully!");

    await Location.syncIndexes();
    console.log("Location indexes synced");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
