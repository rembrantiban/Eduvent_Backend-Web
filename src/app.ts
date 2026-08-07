import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./modules/User/user.Routes"
import eventRoutes from "./modules/Event/event.routes"
import mongoose from "mongoose";
import locationRoutes from "./modules/Location/location.routes"
import departmentRoutes from "./modules/Department/department.routes"
import attendanceRoutes from "./modules/Attendance/attendance.routes"
import notificationRoutes from "./modules/Notification/notifacation.routes"

const app = express();

app.set("trust proxy", 1);
app.get("/api/health", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  res.status(dbReady ? 200 : 500).json({
    status: dbReady ? "OK" : "ERROR",
    db: dbReady,
  });
});

app.use(cors(
  {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CLIENT_URL?.replace(/\/$/, ""), 
        "http://localhost:5173",
         "http://192.168.100.45:8081"
      ];

      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },

    credentials: true,
    methods: ["GET", "POST", "PUT",  "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }

));
app.use(express.json());
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});


app.use("/api/auth", userRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/course", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;