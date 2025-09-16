// Load environment variables from .env
require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

console.log("DEBUG: API_KEY =", process.env.API_KEY);

app.get("/", (req, res) => {
  res.send("Hello World! ✅ Your server is working.");
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
