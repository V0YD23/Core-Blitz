const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  games_won: { type: Number, default: 0 },
  games_lost: { type: Number, default: 0 },
  level: { 
    type: Map, 
    of: Number,  // Values in the map will be numbers
    default: {}  // Default to an empty object
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;




