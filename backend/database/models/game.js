const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  score: { type: Number, default: 0 },
  expected_score: {type: Number,default:0},
  latest_game:{type: Number,default:-1},
});

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;
