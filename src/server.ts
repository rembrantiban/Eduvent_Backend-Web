import app from "./app";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

dotenv.config();
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
  }
}

startServer();
