const child = require("child_process");
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/start", (req, res) => {
  child.spawn("npx", ["node", "dist/index.js"], { 
  }).stdout.on("data", (data) => {
    console.log(data.toString());
  });
  res.send("Started");
});

module.exports = app;