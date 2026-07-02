import express from "express";
import { UserRouter } from "./routes/userRoute.js";
const port = process.env.PORT || "3000"
const app = express();

app.use(express.json());
app.use("/user", UserRouter);
       
app.listen(port, () => { console.log("server is listening at 3000") })