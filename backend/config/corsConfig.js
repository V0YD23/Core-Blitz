const cors = require("cors");

const corsConfig = cors({
  origin: "*",
  methods: ["GET", "POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type"],
});

module.exports = corsConfig;
