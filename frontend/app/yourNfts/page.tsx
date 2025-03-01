"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { NFT } from "@/abi/nft.js";
import { listNFTcontractABI } from "@/abi/listnft"
import { BrowserProvider, Contract } from "ethers";
import Image from "next/image";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const NFTcontractAddress: string = process.env.NEXT_PUBLIC_NFT_ADDRESS || "";
const listNFTcontractAddress: string =
  process.env.NEXT_PUBLIC_LIST_NFT_ADDRESS || "";

export default function MyNFTs() {
  const [nfts, setNfts] = useState<{ tokenId: number; metadata: any }[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<BrowserProvider>();
  const [contract, setContract] = useState<Contract>();
  const [nftContract, setNftContract] = useState<Contract>();
  const [tokenIdtoRent, setTokenIdtoRent] = useState<number>(0);
  const [pricePerHour, setPricePerHour] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedNft, setSelectedNft] = useState<{
    tokenId: number;
    metadata: any;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNFTs();

    // Add tetris block animation effect to background
    const createTetrisBlock = () => {
      const block = document.createElement("div");
      const size = Math.random() * 80 + 20;
      const startPositionX = Math.random() * window.innerWidth;

      block.classList.add("tetris-block");
      block.style.width = `${size}px`;
      block.style.height = `${size}px`;
      block.style.left = `${startPositionX}px`;
      block.style.top = `-${size}px`;

      // Randomize block colors with different blue shades
      const hue = 210 + (Math.random() * 40 - 20); // blue hues with variation
      const saturation = 70 + Math.random() * 30;
      const lightness = 20 + Math.random() * 40;
      const opacity = 0.1 + Math.random() * 0.4;

      block.style.backgroundColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
      block.style.boxShadow = `0 0 ${Math.floor(
        size / 4
      )}px hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.8)`;

      // Random rotation
      block.style.transform = `rotate(${Math.random() * 360}deg)`;

      document.querySelector(".tetris-background")?.appendChild(block);

      // Animation
      const duration = Math.random() * 20000 + 10000; // Between 10-30 seconds
      const animation = block.animate(
        [
          { transform: `translateY(0) rotate(${Math.random() * 360}deg)` },
          {
            transform: `translateY(${window.innerHeight + size}px) rotate(${
              Math.random() * 360
            }deg)`,
          },
        ],
        {
          duration,
          easing: "linear",
          fill: "forwards",
        }
      );

      animation.onfinish = () => {
        block.remove();
      };
    };

    // Create initial blocks
    for (let i = 0; i < 15; i++) {
      createTetrisBlock();
    }

    // Add new blocks periodically
    const interval = setInterval(() => {
      createTetrisBlock();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const openRentModal = (nft: { tokenId: number; metadata: any }) => {
    setSelectedNft(nft);
    setTokenIdtoRent(nft.tokenId);
    setPricePerHour(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNft(null);
    setTokenIdtoRent(0);
    setPricePerHour(0);
  };

  const listForRent = async () => {
    if (!contract || !nftContract) {
      toast.error("Contract not initialized");
      return;
    }

    if (pricePerHour <= 0) {
      toast.error("Please enter a valid price per hour");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading("Preparing to list your NFT...");

      // Convert price to wei (assuming input is in ETH)
      const priceInWei = ethers.parseEther(pricePerHour.toString());

      // First approve the NFT for transfer
      const approveTx = await nftContract.approve(
        listNFTcontractAddress,
        tokenIdtoRent
      );
      toast.loading("Approving NFT transfer...");
      await approveTx.wait();

      // Then list it for rent
      const tx = await contract.listNFTForRent(tokenIdtoRent, priceInWei);
      toast.loading("Confirming transaction...");
      await tx.wait();

      toast.dismiss();
      toast.success(`NFT #${tokenIdtoRent} listed successfully!`);

      closeModal();
      loadNFTs(); // Refresh the NFT list
    } catch (error: any) {
      console.error("Error listing NFT for rent:", error);
      toast.dismiss();
      toast.error(error.message || "Failed to list NFT");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function loadNFTs() {
    if (!window.ethereum) {
      toast.error("Please install MetaMask to view your NFT inventory");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);
      setProvider(provider);

      const contract = new ethers.Contract(NFTcontractAddress, NFT, signer);
      const listNFTContract = new ethers.Contract(
        listNFTcontractAddress,
        listNFTcontractABI,
        signer
      );
      setContract(listNFTContract);
      setNftContract(contract);

      // Fetch NFT token IDs owned by the user
      const tokenIds: number[] = await contract.getOwnedNFTs(userAddress);
      const nftData = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenUri: string = await contract.tokenURI(tokenId);
          console.log(tokenUri);

          const metadata = await fetchMetadata(tokenUri);
          return { tokenId, metadata };
        })
      );

      console.log(nftData);

      setNfts(nftData);
    } catch (error: any) {
      console.error("Error fetching NFTs:", error);
      toast.error(error.message || "Failed to load NFTs");
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
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching metadata:", error);
      return null;
    }
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
        return "text-blue-300";
    }
  }

  function getRarityBorder(rarity: string) {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "border-yellow-400";
      case "epic":
        return "border-purple-500";
      case "rare":
        return "border-blue-500";
      case "uncommon":
        return "border-green-500";
      default:
        return "border-blue-400";
    }
  }

  function getRarityGlow(rarity: string) {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "0 0 20px rgba(250, 204, 21, 0.7)";
      case "epic":
        return "0 0 20px rgba(168, 85, 247, 0.7)";
      case "rare":
        return "0 0 20px rgba(59, 130, 246, 0.7)";
      case "uncommon":
        return "0 0 20px rgba(34, 197, 94, 0.7)";
      default:
        return "0 0 20px rgba(96, 165, 250, 0.7)";
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

  return (
    <>
      <div className="min-h-screen overflow-hidden relative bg-gray-900">
        {/* Tetris background container */}
        <div className="tetris-background fixed inset-0 z-0 overflow-hidden"></div>

        <style jsx global>{`
          .tetris-background {
            pointer-events: none;
          }

          .tetris-block {
            position: absolute;
            border-radius: 4px;
            filter: blur(1px);
            z-index: 0;
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .floating-card {
            transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .floating-card:hover {
            transform: translateY(-12px) scale(1.03);
          }

          .pulse-glow {
            animation: pulse-animation 3s infinite alternate;
          }

          @keyframes pulse-animation {
            0% {
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            }
            100% {
              box-shadow: 0 0 25px rgba(96, 165, 250, 0.8);
            }
          }

          .modal-enter {
            transform: scale(0.9);
            opacity: 0;
          }

          .modal-enter-active {
            transform: scale(1);
            opacity: 1;
            transition: all 0.3s;
          }

          .modal-exit {
            transform: scale(1);
            opacity: 1;
          }

          .modal-exit-active {
            transform: scale(0.9);
            opacity: 0;
            transition: all 0.3s;
          }
        `}</style>

        <div className="relative z-10 p-6">
          <Toaster position="top-right" />

          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
              className="mb-8 flex flex-col items-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.h1
                className="text-5xl font-bold text-center mb-4 text-blue-300 drop-shadow-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.3,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200,
                }}
              >
                <span className="pulse-glow inline-block p-2">
                  🎮 YOUR NFT INVENTORY
                </span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="bg-gray-800 bg-opacity-60 backdrop-blur-md px-6 py-3 rounded-xl mt-2 mb-6 flex items-center space-x-3 shadow-xl border border-blue-500/30"
              >
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      account ? "bg-blue-400" : "bg-red-500"
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                  </div>
                </div>
                <p className="text-sm font-mono text-blue-200">
                  {account
                    ? `${account.slice(0, 6)}...${account.slice(-4)}`
                    : "Connect Wallet"}
                </p>
              </motion.div>
            </motion.div>

            {/* Loading State */}
            {loading && (
              <motion.div
                className="flex flex-col items-center justify-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-blue-300/40 rounded-full animate-pulse"></div>
                </div>
                <p className="mt-6 text-blue-300 font-semibold bg-gray-900/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                  Loading your NFT collection...
                </p>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && nfts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20 bg-gray-800/60 backdrop-blur-md rounded-xl border border-blue-500/30 shadow-xl"
              >
                <motion.div
                  className="mb-6 text-7xl"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.3,
                  }}
                >
                  🎲
                </motion.div>
                <motion.h3
                  className="text-2xl font-bold mb-3 text-blue-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Your inventory is empty!
                </motion.h3>
                <motion.p
                  className="text-blue-200/70 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Complete quests to earn game NFTs
                </motion.p>
                <motion.button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg shadow-blue-900/50 border border-blue-400/20 hover:shadow-blue-500/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  Start Adventure
                </motion.button>
              </motion.div>
            )}

            {/* NFT Grid */}
            {!loading && nfts.length > 0 && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {nfts.map((nft, index) => {
                  const rarity = getRarityFromAttributes(
                    nft.metadata?.attributes
                  );
                  const rarityColor = getRarityColor(rarity);
                  const rarityBorder = getRarityBorder(rarity);
                  const rarityGlow = getRarityGlow(rarity);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.5,
                        type: "spring",
                        stiffness: 100,
                      }}
                      className="floating-card"
                    >
                      <div
                        className="h-full bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm rounded-xl overflow-hidden border-2 shadow-lg flex flex-col relative"
                        style={{
                          boxShadow: rarityGlow,
                          borderColor: rarityBorder.replace("border-", ""),
                        }}
                      >
                        {/* Background tetris shape decorations */}
                        <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500/10 rounded rotate-45 blur-sm"></div>
                        <div className="absolute -bottom-10 -right-10 w-16 h-16 bg-blue-300/10 rounded-sm rotate-12 blur-sm"></div>

                        {/* NFT Image Container */}
                        <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-gray-900/80 to-gray-800/80 flex items-center justify-center p-3 overflow-hidden">
                          {/* Animated background light effect */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-blue-400/30 blur-3xl animate-pulse"></div>
                          </div>

                          {/* NFT Image */}
                          {nft.metadata?.image ? (
                            <div className="relative w-full h-full rounded-lg overflow-hidden transform transition-all duration-700 hover:scale-105 z-10">
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                              <Image
                                src={nft.metadata.metadata.image.replace(
                                  "ipfs://",
                                  "https://gateway.pinata.cloud/ipfs/"
                                )}
                                alt={nft.metadata?.name || "NFT"}
                                layout="fill"
                                objectFit="cover"
                                className="p-2 hover:p-0 transition-all duration-300"
                              />
                            </div>
                          ) : (
                            <div className="text-6xl animate-float">🎮</div>
                          )}

                          {/* Rarity Badge */}
                          <div
                            className={`absolute top-3 right-3 px-4 py-1 rounded-full text-xs font-bold uppercase ${rarityColor} bg-gray-900/80 backdrop-blur-md border border-gray-700/50 z-20 shadow-lg transform transition-transform duration-300 hover:scale-110`}
                          >
                            {rarity}
                          </div>

                          {/* Token ID Badge */}
                          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-mono border border-blue-500/30 text-blue-300 shadow-inner z-20">
                            #{nft.tokenId.toString()}
                          </div>
                        </div>

                        {/* NFT Info */}
                        <div className="p-5 flex flex-col flex-1 bg-gradient-to-b from-gray-900/20 to-gray-800/20 backdrop-blur-sm">
                          {/* Title */}
                          <h3
                            className={`text-xl font-bold mb-2 truncate ${rarityColor}`}
                          >
                            {nft.metadata?.name || "Unnamed NFT"}
                          </h3>

                          {/* Description */}
                          <p className="text-blue-100/70 text-sm mb-4 line-clamp-3">
                            {nft.metadata?.description ||
                              "No description available."}
                          </p>

                          {/* Attributes Grid */}
                          {nft.metadata?.attributes?.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                              {nft.metadata.attributes
                                .filter(
                                  (attr: any) =>
                                    attr.trait_type?.toLowerCase() !==
                                      "rarity" &&
                                    attr.trait_type?.toLowerCase() !== "tier"
                                )
                                .slice(0, 4)
                                .map((attr: any, idx: any) => (
                                  <div
                                    key={idx}
                                    className={`bg-blue-900/20 backdrop-blur-sm px-3 py-2 rounded-lg text-xs border-l-2 transform transition-all duration-300 hover:-translate-y-1 ${rarityBorder}`}
                                  >
                                    <span className="text-blue-300/70 block text-xs">
                                      {attr.trait_type}
                                    </span>
                                    <span className="font-medium text-blue-100">
                                      {attr.value}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Action Button */}
                          <motion.button
                            onClick={() => openRentModal(nft)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full mt-5 py-3 px-4 rounded-lg transition-all duration-300 text-sm font-bold shadow-lg text-white bg-blue-600 hover:bg-blue-700 border border-blue-400/30`}
                            style={{
                              boxShadow: `0 4px 20px -5px ${rarityColor.replace(
                                "text-",
                                ""
                              )}`,
                            }}
                          >
                            List for Rent
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Rent Modal */}
        <AnimatePresence>
          {showModal && selectedNft && (
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-500/50"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-2xl font-bold text-blue-400">
                    List NFT for Rent
                  </h3>
                  <motion.button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700/70 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ×
                  </motion.button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-4 mb-6 bg-blue-900/20 rounded-xl p-3 border border-blue-500/20">
                    <div className="relative w-20 h-20 bg-gray-900/80 rounded-lg overflow-hidden flex-shrink-0 border-2 border-blue-500/30 shadow-lg shadow-blue-500/20">
                      {selectedNft.metadata?.image ? (
                        <Image
                          src={selectedNft.metadata.metadata.image.replace(
                            "ipfs://",
                            "https://gateway.pinata.cloud/ipfs/"
                          )}
                          alt={selectedNft.metadata?.name || "NFT"}
                          layout="fill"
                          objectFit="contain"
                          className="p-1"
                        />
                      ) : (
                        <div className="text-3xl flex items-center justify-center h-full">
                          🎮
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-300 text-lg">
                        {selectedNft.metadata?.name || "Unnamed NFT"}
                      </h4>
                      <p className="text-sm text-blue-400/70 mt-1">
                        ID: #{selectedNft.tokenId}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/20">
                      <label className="block text-sm font-medium text-blue-300 mb-2">
                        Token ID (pre-filled)
                      </label>
                      <input
                        type="number"
                        value={tokenIdtoRent}
                        readOnly
                        className="w-full px-4 py-3 bg-gray-800/80 border border-blue-500/30 rounded-lg text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      />
                    </div>

                    <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/20">
                      <label className="block text-sm font-medium text-blue-300 mb-2">
                        Price per hour (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={pricePerHour}
                        onChange={(e) =>
                          setPricePerHour(parseFloat(e.target.value))
                        }
                        className="w-full px-4 py-3 bg-gray-800/80 border border-blue-500/30 rounded-lg text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                        placeholder="0.1"
                      />
                      <p className="mt-2 text-xs text-blue-300/70">
                        Set the hourly rate in ETH for renting this NFT
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <motion.button
                    onClick={closeModal}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-blue-300 rounded-lg transition duration-200 border border-blue-500/20"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={listForRent}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex-1 px-4 py-3 rounded-lg transition duration-300 font-medium ${
                      isSubmitting
                        ? "bg-gray-700 cursor-not-allowed text-gray-400 border border-gray-600/30"
                        : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-400/30"
                    }`}
                    style={{
                      boxShadow: isSubmitting
                        ? "none"
                        : "0 4px 20px -5px rgba(59, 130, 246, 0.7)",
                    }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0a12 12 0 00-12 12h4z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "List for Rent"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
