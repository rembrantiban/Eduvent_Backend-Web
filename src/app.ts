import express from "express";
import cors from "cors";


const app = express();

app.use(cors(
  { 
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"],
  }

));
app.use(express.json());
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});


app.use("/api/auth", require("./modules/User/user.Routes").default);
app.use("/api/event", require("./modules/Event/event.Routes").default);
app.use("/api/face", require("./modules/Face/face.routes").default);


export default app;