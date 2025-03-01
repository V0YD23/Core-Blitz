// utils/ipfsUtils.ts
import axios from "axios";

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY =process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

export const uploadToIPFS = async (metadata: any) => {
  try {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"; // Use pinJSONToIPFS for metadata

    const response = await axios.post(url, metadata, {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    // Get IPFS hash (CID)
    const ipfsHash = response.data.IpfsHash;
    console.log(`✅ Metadata uploaded! IPFS Hash: ${ipfsHash}`);
    return `ipfs://${ipfsHash}`; // Return IPFS URL
  } catch (error: any) {
    console.error(
      "❌ Error uploading metadata to IPFS:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};
