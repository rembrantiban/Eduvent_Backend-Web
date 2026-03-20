import app from "./app";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

dotenv.config();

connectDB();  
const PORT = Number(process.env.PORT) || 3000;

// console.log("Resend API Key:", !!process.env.RESEND_API_KEY);
// console.log("FACEPP_KEY =", process.env.FACEPP_KEY);
// console.log("FACEPP_SECRET =", process.env.FACEPP_SECRET);

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
