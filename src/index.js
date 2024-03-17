import connectDB from "./db/index.js";
import dotenv from "dotenv";

connectDB();

dotenv.config({ path: "./env" });
