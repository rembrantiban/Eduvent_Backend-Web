import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./modules/User/user.Routes"
import eventRoutes from "./modules/Event/event.routes"
import faceRoutes from "./modules/Face/face.routes"
import locationRoutes from "./modules/Location/location.routes"
import departmentRoutes from "./modules/Department/department.routes"
import attendanceRoutes from "./modules/Attendance/attendance.routes"

const app = express();

app.set("trust proxy", 1);
app.use(cors(
  {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CLIENT_URL?.replace(/\/$/, ""), 
        "http://localhost:5173"
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
    methods: ["GET", "POST", "PUT", "DELETE"],
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
app.use("/api/face", faceRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);

export default app;