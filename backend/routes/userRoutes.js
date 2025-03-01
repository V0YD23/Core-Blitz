const express = require("express");
const router = express.Router();
const User = require("../database/models/user");
const Game = require("../database/models/game");

router.post("/create-user", async (req, res) => {
  const { publicKey } = req.body;
  console.log(publicKey);
  try {
    if (!publicKey) {
      return res.status(400).json({ error: "Public key is required!" });
    }

    let user = await User.findOne({ username: publicKey });
    if (user) {
      return res.status(200).json({ message: "User already exists!" });
    }

    user = new User({ username: publicKey });
    let game = new Game({ username: publicKey });
    await user.save();
    await game.save();


    res.status(201).json({ message: "User created successfully!", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/game-end", async (req, res) => {
  try {
    const { won, publicKey } = req.body;

    let user = await User.findOne({ username: publicKey });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (won) {
      user.games_won += 1;
      user.level.set(user.games_won.toString(), 1);
    } else {
      user.games_lost += 1;
    }

    await user.save();
    res.status(200).json({ message: "Updated the LeaderBoard Data" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/transferred-nft", async (req, res) => {
  try {
    const { originalOwner_publicKey, newOwner_publicKey, which_level } =
      req.body;
    if (!originalOwner_publicKey || !newOwner_publicKey) {
      return res.status(400).json({ error: "publicKey is required" });
    }

    const owner = await User.findOne({ username: originalOwner_publicKey });
    const renter = await User.findOne({ username: newOwner_publicKey });

    if (!owner || !renter) {
      return res.status(404).json({ error: "User not found" });
    }

    owner.level.set(which_level.toString(), 0);
    renter.level.set(which_level.toString(), 1);
    owner.games_won -= 1;
    renter.games_won += 1;
    await owner.save();
    await renter.save();

    res.status(200).json({ message: "Updated the Database" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/current-level", async (req, res) => {
  try {
    const { publicKey } = req.query;
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required" });
    }

    const user = await User.findOne({ username: publicKey });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const levelEntries = Array.from(user.level.entries());
    const firstZeroLevel = levelEntries.find(([key, value]) => value === 0);

    if (firstZeroLevel) {
      return res.json({ level: Number(firstZeroLevel[0]) });
    }

    const highestLevel = Math.max(
      ...levelEntries.map(([key]) => Number(key)),
      0
    );
    res.json({ level: highestLevel + 1 });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
