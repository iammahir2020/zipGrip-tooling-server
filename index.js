const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ZipGrip Tooling Server is LIVE!");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
