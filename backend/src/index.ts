import "dotenv/config"; 

import express from "express";
import { UserRouter } from "./routes/userRoute.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || "3000";
const app = express();

app.use(express.json());
app.use("/user", UserRouter);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
});