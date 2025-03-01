const axios = require("axios");
const User = require("../database/models/user"); // Import User model if needed
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY; // Store API key securely
// Function to fetch CORE price
const getCorePrice = async (req, res) => {
  try {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=CORE`;
    
    const { data } = await axios.get(url, {
      headers: {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
      },
    });

    if (data?.data?.CORE?.quote?.USD?.price) {
      res.json({ price: data.data.CORE.quote.USD.price });
    } else {
      res.status(400).json({ error: "Invalid API response" });
    }
  } catch (error) {
    console.error("Error fetching CORE price:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch price" });
  }
};



// Function to generate game NFT metadata
const generateMetadataNFT = async (req, res) => {
  try {
    const { publicKey, score, level } = req.body;
    if (!publicKey || score == null) {
      return res.status(400).json({ error: "Missing publicKey or score" });
    }

    let user = await User.findOne({ username: publicKey });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = {
      name: `Game NFT - Level ${level}`,
      description: `NFT for ${publicKey} for completing level ${level}`,
      attributes: [
        { trait_type: "Level", value: level },
        { trait_type: "Score", value: `${score} coins collected` },
        { trait_type: "Owner", value: publicKey },
      ],
    };

    console.log("Generated Metadata:", metadata);
    res.status(200).json({ metadata });
  } catch (error) {
    console.error("Error generating metadata:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Export the functions
module.exports = {
  getCorePrice,
  generateMetadataNFT,
};
