import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoDbUrl = process.env.mongoDbUrl;

  if (!mongoDbUrl) {
    throw new Error("FATAL ERROR: mongoDB URL is not defined in the environment.");
  }

  try {
    await mongoose.connect(mongoDbUrl);
    mongoose.set('debug', true);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};