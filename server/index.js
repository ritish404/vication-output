require('dotenv').config();
const express = require('express');
const cors = require("cors");
const { MongoClient } = require("mongodb");
const router = require('./APIs/modelapp');

const app = express();
const PORT = Number(process.env.PORT) || 4700;

app.use(cors());

if (process.env.DB_URI) {
  const client = new MongoClient(process.env.DB_URI);
  client
    .connect()
    .then(() => {
      client.db("outfitDB");
      console.log("Database Connected Successfully.");
    })
    .catch((err) => {
      console.log("Database connection failed:", err.message);
    });
} else {
  console.log("DB_URI not configured. Starting server without MongoDB connection.");
}

app.use(express.json());
app.use("/model", router);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
