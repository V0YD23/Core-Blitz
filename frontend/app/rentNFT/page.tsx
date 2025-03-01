"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { listNFTcontractABI } from "@/abi/listnft.js";
import { NFT } from "@/abi/nft.js";
import Image from "next/image";
import { FaEthereum } from "react-icons/fa";
import { HiClock } from "react-icons/hi";
import { GiMagicSwirl } from "react-icons/gi";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";

const NFTcontractAddress: string = process.env.NEXT_PUBLIC_NFT_ADDRESS || "";
const listNFTcontractAddress: string =
  process.env.NEXT_PUBLIC_LIST_NFT_ADDRESS || "";

interface NFT {
  tokenId: number;
  owner: string;
  pricePerHour: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    attributes: any[];
  };
}

// Tetris block types
const tetrisBlocks = [
  { shape: "I", color: "#00FFFF" }, // Cyan
  { shape: "J", color: "#0000FF" }, // Blue
  { shape: "L", color: "#ADD8E6" }, // Light blue
  { shape: "O", color: "#87CEFA" }, // Sky blue
  { shape: "S", color: "#1E90FF" }, // Dodger blue
  { shape: "T", color: "#4682B4" }, // Steel blue
  { shape: "Z", color: "#6495ED" }, // Cornflower blue
];

export default function AvailableNFTs() {
  const [availableNFTs, setAvailableNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [hoursToRent, setHoursToRent] = useState<number>(1);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const api = process.env.NEXT_PUBLIC_BACKEND_API;

  useEffect(() => {
    loadAvailableNFTs();
    initTetrisBackground();
  }, []);

  // Tetris background animation
  const initTetrisBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Exit early if canvas is null
    
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create initial blocks
    const blocks: any[] = [];
    for (let i = 0; i < 15; i++) {
      createNewBlock(blocks);
    }

    function createNewBlock(blockArray: any[]) {
      const blockType = tetrisBlocks[Math.floor(Math.random() * tetrisBlocks.length)];
      const size = Math.random() * 50 + 20;
      
      blockArray.push({
        x:Math.random() * (canvasRef.current?.width ?? 0),
        y: -size,
        size: size,
        speed: Math.random() * 0.5 + 0.1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        color: blockType.color,
        shape: blockType.shape,
        opacity: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * 0.01 + 0.005,
        pulseDirection: 1,
      });
    }

    function drawTetrisBlock(block: any) {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(block.x + block.size / 2, block.y + block.size / 2);
      ctx.rotate((block.rotation * Math.PI) / 180);
      ctx.globalAlpha = block.opacity;
      
      // Draw different shapes based on type
      switch (block.shape) {
        case "I":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 2, -block.size / 8, block.size, block.size / 4);
          break;
        case "J":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 2, -block.size / 4, block.size / 2, block.size / 2);
          ctx.fillRect(-block.size / 4, -block.size / 2, block.size / 2, block.size / 4);
          break;
        case "L":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 2, -block.size / 4, block.size / 2, block.size / 2);
          ctx.fillRect(0, -block.size / 2, block.size / 2, block.size / 4);
          break;
        case "O":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 4, -block.size / 4, block.size / 2, block.size / 2);
          break;
        case "S":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 4, -block.size / 4, block.size / 2, block.size / 2);
          ctx.fillRect(-block.size / 2, 0, block.size / 2, block.size / 2);
          break;
        case "T":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 2, -block.size / 4, block.size, block.size / 2);
          ctx.fillRect(-block.size / 4, -block.size / 2, block.size / 2, block.size / 4);
          break;
        case "Z":
          ctx.fillStyle = block.color;
          ctx.fillRect(-block.size / 2, -block.size / 4, block.size / 2, block.size / 2);
          ctx.fillRect(0, 0, block.size / 2, block.size / 2);
          break;
      }
      
      // Add glow effect
      ctx.shadowColor = block.color;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.restore();
    }

    function animate() {
      if (!ctx || !canvas) return;
      
      // Clear canvas with dark blue background
      ctx.fillStyle = 'rgba(5, 15, 40, 0.03)';  // Almost transparent for trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw blocks
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // Move block
        block.y += block.speed;
        block.rotation += block.rotationSpeed;
        
        // Pulsating glow
        block.opacity += block.pulse * block.pulseDirection;
        if (block.opacity > 0.4 || block.opacity < 0.1) {
          block.pulseDirection *= -1;
        }
        
        // Draw block
        drawTetrisBlock(block);
        
        // Remove blocks that are off-screen and create new ones
        if (block.y > canvas.height) {
          blocks.splice(i, 1);
          createNewBlock(blocks);
          i--;
        }
      }
      
      requestAnimationFrame(animate);
    }

    // Handle window resize
    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  const openRentModal = (nft: NFT) => {
    setSelectedNft(nft);
    setHoursToRent(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNft(null);
    setHoursToRent(1);
  };

  async function loadAvailableNFTs() {
    if (!window.ethereum) {
      toast.error("Please install MetaMask to view available NFTs");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);

      const listNFTContract = new ethers.Contract(
        listNFTcontractAddress,
        listNFTcontractABI,
        signer
      );
      const nftContract = new ethers.Contract(NFTcontractAddress, NFT, signer);

      // Get available NFTs from the rental contract
      const [tokenIds, owners, prices] =
        await listNFTContract.getAvailableNFTs();

      // Fetch metadata for each available NFT
      const nftData = await Promise.all(
        tokenIds.map(async (tokenId: bigint, index: number) => {
          try {
            const tokenUri = await nftContract.tokenURI(tokenId);
            const metadata = await fetchMetadata(tokenUri);

            return {
              tokenId: Number(tokenId),
              owner: owners[index],
              pricePerHour: ethers.formatEther(prices[index]),
              metadata,
            };
          } catch (error) {
            console.error(
              `Error fetching metadata for token ${tokenId}:`,
              error
            );
            return {
              tokenId: Number(tokenId),
              owner: owners[index],
              pricePerHour: ethers.formatEther(prices[index]),
            };
          }
        })
      );

      setAvailableNFTs(nftData);
    } catch (error: any) {
      console.error("Error fetching available NFTs:", error);
      toast.error(error.message || "Failed to load available NFTs");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata(ipfsUri: string) {
    try {
      const ipfsHash = ipfsUri.replace("ipfs://", "");
      const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to fetch metadata");

      return await response.json();
    } catch (error) {
      console.error("❌ Error fetching metadata:", error);
      return null;
    }
  }

  async function rentNFT() {
    if (!selectedNft || !window.ethereum) return;

    try {
      setIsSubmitting(true);
      toast.loading("Preparing to rent NFT...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const listNFTContract = new ethers.Contract(
        listNFTcontractAddress,
        listNFTcontractABI,
        signer
      );
      const nftContract = new ethers.Contract(NFTcontractAddress, NFT, signer);
      // Calculate total cost
      const pricePerHourWei = ethers.parseEther(selectedNft.pricePerHour);
      const totalCost = pricePerHourWei * BigInt(hoursToRent);

      // Call the rentNFT function
      // Fetch original owner before calling rentNFT
      const originalOwner = await nftContract.ownerOf(selectedNft.tokenId);

      const tx = await listNFTContract.rentNFT(
        selectedNft.tokenId,
        hoursToRent,
        {
          value: totalCost,
        }
      );

      toast.loading("Confirming transaction...");
      await tx.wait();

      // Call changeHasCompleted with the original owner
      const change_HasCompleted = await nftContract.changeHasCompleted(
        originalOwner,
        selectedNft.tokenId
      );
      await change_HasCompleted.wait();

      const level = await nftContract.tokenLevel(selectedNft.tokenId);
      const response = await fetch(`${api}/transferred-nft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalOwner_publicKey: originalOwner,
          newOwner_publicKey: account,
          which_level: level,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch proof");

      toast.dismiss();
      toast.success(
        `Successfully rented NFT #${selectedNft.tokenId} for ${hoursToRent} hours!`
      );

      closeModal();
      loadAvailableNFTs(); // Refresh the NFT list
    } catch (error: any) {
      console.error("Error renting NFT:", error);
      toast.dismiss();
      toast.error(error.message || "Failed to rent NFT");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getRarityFromAttributes(attributes: any[]) {
    if (!attributes) return "common";
    const rarityAttr = attributes.find(
      (attr) =>
        attr.trait_type?.toLowerCase() === "rarity" ||
        attr.trait_type?.toLowerCase() === "tier"
    );
    return rarityAttr?.value || "common";
  }

  function getRarityColor(rarity: string) {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "text-yellow-400";
      case "epic":
        return "text-purple-500";
      case "rare":
        return "text-blue-500";
      case "uncommon":
        return "text-green-500";
      default:
        return "text-gray-300";
    }
  }

  function getRarityBorder(rarity: string) {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "border-yellow-400 shadow-yellow-400/30";
      case "epic":
        return "border-purple-500 shadow-purple-500/30";
      case "rare":
        return "border-blue-500 shadow-blue-500/30";
      case "uncommon":
        return "border-green-500 shadow-green-500/30";
      default:
        return "border-blue-300 shadow-blue-300/30";
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-blue-950 to-[#050F28]">
      {/* Tetris Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      <div className="relative z-10 p-6">
        <Toaster position="top-right" />

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center">
            <motion.h1
              className="text-5xl md:text-6xl font-extrabold text-center mb-4"
              style={{
                WebkitTextStroke: "1px #4682B4", // Steel blue border effect
                WebkitTextFillColor: "#87CEFA", // Sky blue fill
                textShadow: "0 0 15px rgba(135, 206, 250, 0.8)", // Glowing effect
              }}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              🎮 TETRIS LEVEL MARKETPLACE
            </motion.h1>

            <div className="bg-blue-900/80 backdrop-blur-sm px-4 py-2 rounded-full mt-2 mb-4 flex items-center space-x-2 shadow-lg shadow-blue-500/20 border border-blue-700">
              <div
                className={`w-3 h-3 rounded-full ${
                  account ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <p className="text-sm font-mono text-blue-100">
                {account
                  ? `${account.slice(0, 6)}...${account.slice(-4)}`
                  : "Connect Wallet"}
              </p>
            </div>
            <motion.p
              className="text-xl md:text-2xl font-semibold text-center max-w-3xl mx-auto text-blue-200 drop-shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                textShadow: "0 0 10px rgba(173, 216, 230, 0.5)",
              }}
            >
              Rent powerful game levels to advance your journey
            </motion.p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-400/50"></div>
              <p className="mt-4 text-blue-300 font-semibold" style={{ textShadow: "0 0 5px rgba(173, 216, 230, 0.7)" }}>
                Loading available NFTs...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && availableNFTs.length === 0 && (
            <div className="text-center py-20 bg-blue-900/50 backdrop-blur-sm rounded-lg border border-blue-700 shadow-xl">
              <div className="mb-4 text-6xl animate-pulse">🎲</div>
              <h3 className="text-xl font-bold mb-2 text-blue-200" style={{ textShadow: "0 0 5px rgba(135, 206, 250, 0.7)" }}>
                No NFTs available for rent
              </h3>
              <p className="text-blue-300 mb-6">
                Check back later or list your own NFTs for rent
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70">
                Explore Quests
              </button>
            </div>
          )}

          {/* NFT Grid */}
          {!loading && availableNFTs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableNFTs.map((nft, index) => {
                const rarity = getRarityFromAttributes(
                  nft.metadata?.attributes || []
                );
                const rarityColor = getRarityColor(rarity);
                const rarityBorder = getRarityBorder(rarity);

                return (
                  <motion.div
                    key={nft.tokenId}
                    className={`bg-blue-900/40 backdrop-blur-sm rounded-lg overflow-hidden border-2 ${rarityBorder} transition-all duration-300 hover:shadow-lg shadow-md hover:-translate-y-1 flex flex-col`}
                    style={{
                      boxShadow: "0 4px 15px rgba(100, 149, 237, 0.3)",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{
                      boxShadow: "0 8px 25px rgba(100, 149, 237, 0.5)",
                    }}
                  >
                    {/* NFT Image */}
                    <div className="relative min-h-48 bg-blue-950 flex items-center justify-center">
                      {nft.metadata?.image ? (
                        <div className="w-full h-full relative">
                          <Image
                            src={nft.metadata.image.replace(
                              "ipfs://",
                              "https://gateway.pinata.cloud/ipfs/"
                            )}
                            alt={nft.metadata?.name || "Game NFT"}
                            layout="fill"
                            objectFit="contain"
                            className="p-2 hover:scale-105 transition-transform duration-300"
                            style={{
                              filter: "drop-shadow(0 0 8px rgba(135, 206, 250, 0.7))",
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-6xl" style={{ filter: "drop-shadow(0 0 5px #4682B4)" }}>🎮</div>
                      )}

                      {/* Rarity Badge */}
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold uppercase ${rarityColor} bg-blue-950 bg-opacity-80 backdrop-blur-sm border border-blue-800 shadow-md`}
                        style={{ textShadow: "0 0 5px currentColor" }}
                      >
                        {rarity}
                      </div>

                      {/* Token ID Badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-mono bg-blue-900 bg-opacity-80 backdrop-blur-sm border border-blue-700 text-blue-300 shadow-md">
                        #{nft.tokenId.toString()}
                      </div>
                    </div>

                    {/* NFT Info */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold mb-1 truncate text-blue-200" style={{ textShadow: "0 0 5px rgba(135, 206, 250, 0.5)" }}>
                        {nft.metadata?.name || "Game Level NFT"}
                      </h3>

                      {/* Improved Description */}
                      <p className="text-blue-300 text-sm mb-4 line-clamp-3">
                        {nft.metadata?.description || "No description available"}
                      </p>

                      {/* Price and Owner Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-blue-200" style={{ textShadow: "0 0 3px rgba(135, 206, 250, 0.6)" }}>
                          <FaEthereum className="mr-2 text-blue-300" />
                          <span className="font-mono">
                            {nft.pricePerHour} ETH / hour
                          </span>
                        </div>

                        <div className="flex items-center text-blue-300 text-sm truncate">
                          <HiClock className="mr-2 flex-shrink-0" />
                          <span className="truncate">
                            Owner: {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                          </span>
                        </div>
                      </div>

                      {/* Attributes */}
                      {nft.metadata?.attributes && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {nft.metadata.attributes
                            ?.filter(
                              (attr: any) =>
                                attr.trait_type?.toLowerCase() !== "rarity" &&
                                attr.trait_type?.toLowerCase() !== "tier"
                            )
                            .slice(0, 4)
                            .map((attr: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-blue-800/40 backdrop-blur-sm px-2 py-1 rounded text-xs border border-blue-700/50 shadow-sm"
                              >
                                <span className="text-blue-300">
                                  {attr.trait_type}:{" "}
                                </span>
                                <span className="font-medium text-blue-200">{attr.value}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => openRentModal(nft)}
                        className="w-full mt-auto bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md transition duration-200 text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center border border-blue-500/50"
                        style={{ boxShadow: "0 0 10px rgba(30, 144, 255, 0.5)" }}
                      >
                        <GiMagicSwirl className="mr-2" /> Rent this Level
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rent Modal */}
      {showModal && selectedNft && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            className="bg-blue-900/80 backdrop-blur-md rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-500"
            style={{
              boxShadow: "0 0 30px rgba(100, 149, 237, 0.5)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-200" style={{ textShadow: "0 0 5px rgba(135, 206, 250, 0.7)" }}>
                Rent NFT Level
              </h3>
              <button
                onClick={closeModal}
                className="text-blue-300 hover:text-white bg-blue-800/50 hover:bg-blue-700/70 rounded-full w-8 h-8 flex items-center justify-center transition-colors duration-200 border border-blue-600/50"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative w-16 h-16 bg-blue-950 rounded-md overflow-hidden flex-shrink-0 border border-blue-700 shadow-md shadow-blue-500/30">
                  {selectedNft.metadata?.image ? (
                    <Image
                      src={selectedNft.metadata.image.replace(
                        "ipfs://",
                        "https://gateway.pinata.cloud/ipfs/"
                      )}
                      alt={selectedNft.metadata?.name || "NFT"}
                      layout="fill"
                      objectFit="contain"
                      className="p-1"
                      style={{
                        filter: "drop-shadow(0 0 5px rgba(135, 206, 250, 0.7))",
                      }}
                    />
                  ) : (
                    <div className="text-2xl flex items-center justify-center h-full">
                      🎮
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-blue-200" style={{ textShadow: "0 0 5px rgba(135, 206, 250, 0.5)" }}>
                    {selectedNft.metadata?.name || "Game Level NFT"}
                  </h4>
                  <p className="text-sm text-blue-300">
                    ID: #{selectedNft.tokenId}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1">
                    Price per hour
                  </label>
                  <div className="flex items-center space-x-2 text-lg font-mono bg-blue-800/50 backdrop-blur-sm border border-blue-600 rounded-md px-3 py-2 shadow-inner">
                    <FaEthereum className="text-blue-300" />
                    <span className="text-blue-200">{selectedNft.pricePerHour} ETH</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1">
                    Number of hours to rent
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={hoursToRent}
                    onChange={(e) =>
                      setHoursToRent(parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 bg-blue-800/50 backdrop-blur-sm border border-blue-600 rounded-md text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
                  />
                </div>

                <div className="bg-blue-800/50 backdrop-blur-sm rounded-md p-3 border border-blue-600 shadow-inner">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200">Total cost:</span>
                    <span className="font-mono font-medium text-blue-100" style={{ textShadow: "0 0 5px rgba(135, 206, 250, 0.5)" }}>
                      {(
                        parseFloat(selectedNft.pricePerHour) * hoursToRent
                      ).toFixed(6)}{" "}
                      ETH
                    </span>
                  </div>
                  <div className="text-xs text-blue-300">
                    NFT will be returned automatically after the rental period
                    ends
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-blue-800/60 hover:bg-blue-700 text-blue-200 hover:text-white rounded-md transition duration-200 border border-blue-700/50"
              >
                Cancel
              </button>
              <button
                onClick={rentNFT}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-md transition duration-200 font-medium shadow-lg ${
                  isSubmitting
                    ? "bg-blue-700/60 cursor-not-allowed text-blue-300"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30"
                }`}
                style={{
                  textShadow: isSubmitting ? "none" : "0 0 5px rgba(255, 255, 255, 0.3)"
                }}
              >
                {isSubmitting ? "Processing..." : "Rent Now"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}