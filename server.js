const express = require('express');
const app = express();

app.set("view engine", "ejs");
app.get("/login", (req, res) => {
  res.render("login");
}); 
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});