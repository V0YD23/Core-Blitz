const express = require("express");
const path = require("path");
require("dotenv").config();
const connectDB = require("./database/conn");
const app = express();
const PORT = process.env.PORT || 5000; // Use Render’s assigned port
const userRoutes = require("./routes/userRoutes"); // Import user routes
const gameRoutes = require("./routes/gameRoutes")
const {
  getCorePrice,
  generateMetadataNFT,
} = require("./routes/utils"); // Import functions


// Connect to MongoDB Atlas
connectDB();

const corsConfig = require("./config/corsConfig");
app.use(corsConfig);



// Serve the main HTML file

app.use(express.json()); // Middleware to parse JSON bodies






// Define routes using imported functions
app.get("/get-core-price", getCorePrice);
app.post("/generate-metadata-nft", generateMetadataNFT);
app.use("/api/User", userRoutes);
app.use("/api", gameRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

