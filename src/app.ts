  import express from "express";
  import cors from "cors";
  import cookieParser from "cookie-parser";


  const app = express();

  app.use(cors(
    { 
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type","Authorization"],
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


  app.use("/api/auth", require("./modules/User/user.Routes").default);
  app.use("/api/event", require("./modules/Event/event.Routes").default);
  app.use("/api/face", require("./modules/Face/face.routes").default);
  app.use("/api/location", require("./modules/Location/location.routes").default);


  export default app;