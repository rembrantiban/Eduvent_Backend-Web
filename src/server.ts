import app from "./app";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { startCloseAttendanceJob } from "./jobs/closeAttendance.job";

dotenv.config();
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDB();
    startCloseAttendanceJob();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
  }
}

startServer();
