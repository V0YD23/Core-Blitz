"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers, BrowserProvider, Contract } from "ethers";
import { Loader2, Gamepad, AlertCircle } from "lucide-react";
import { Staking } from "@/abi/staking";
import { startTetrisGame } from "@/utils/game";
import { useRouter } from "next/navigation";
import { uploadToIPFS } from "@/utils/ipfsUpload";
interface TetrisHomePageProps {}

interface WalletInfo {
  address: string;
  balance: number;
}

const TetrisHomePage: React.FC<TetrisHomePageProps> = () => {
  const router = useRouter();
  const STAKING_CONTRACT_ADDRESS: string =
    process.env.NEXT_PUBLIC_STAKING || "";
  const api: string = process.env.NEXT_PUBLIC_BACKEND_API || "";
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isCalculatingProfit, setIsCalculatingProfit] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(() => {
    // Fetch from localStorage on initial render
    const storedWallet = localStorage.getItem("walletInfo");
    return storedWallet ? JSON.parse(storedWallet) : null;
  });
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [stakeInput, setStakeInput] = useState<string>("0");
  const [gameEnded, setGameEnded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("gameEnded"));
    }
    return false;
  });
  
  const [fallingBlocks, setFallingBlocks] = useState<
    Array<{ id: number; x: number; y: number; color: string }>
  >([]);
  const [blockId, setBlockId] = useState<number>(0);
  const [contract, setContract] = useState<Contract>();
  const [provider, setProvider] = useState<BrowserProvider | undefined>();
  const [error, setError] = useState("");
  const [estimatedProfit, setEstimatedProfit] = useState(0);
  const [expectedScore, setExpectedScore] = useState<string>(
    () =>
      (typeof window !== "undefined" &&
        localStorage.getItem("expectedScore")) ||
      "0"
  );
  const [gameScore, setgameScore] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("gameScore")) || ""
  );
  const restartGame = () => {
    setShowProfitEstimate(false)
    setIsCalculatingProfit(false)
    setStakedAmount(0)
    setStakeInput("0")
    setEstimatedProfit(0)
    setExpectedScore("0")
    // Add any other game state resets here
  };
  const handleWithdraw = async () => {
    if (!contract) {
      setError("Please connect wallet first");
      return;
    }

    try {
      // setIsLoading(true);
      setError("");

      const response = await fetch(
        `${api}/api/message?publicKey=${encodeURIComponent(walletInfo?.address || "")}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();
      const score = data.score;
      setgameScore(score);
      console.log(score);

      const tx = await contract.withdraw(score);
      await tx.wait();


      const gameWon = score >= expectedScore ? 1:0;
      console.log(score, gameWon, walletInfo?.address);

      const gameEndResponse = await fetch(`${api}/api/User/game-end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: score,
          won: gameWon,
          publicKey: walletInfo?.address,
        }),
      });

      if (!gameEndResponse.ok) throw new Error("Failed to End Game");


      if (gameWon) {
        const resp = await fetch(
          `${api}/api/User/current-level?publicKey=${walletInfo?.address}`
        );
        const temp = await resp.json();
        const lev = temp.level;
        console.log("level " + lev);
        setCurrentLevel(lev);

        const response = await fetch(`${api}/generate-metadata-nft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicKey: walletInfo?.address,
            score: score,
            level: lev - 1,
          }),
        });

        if (!response.ok) throw new Error("Failed to generate metadata");
        const { metadata } = await response.json();

        if (!metadata) throw new Error("Received null metadata");

        const hash = await uploadToIPFS(metadata);
        if (!hash) throw new Error("Failed to upload metadata to IPFS");

        await fetchStakedBalance(contract, walletInfo?.address || "");
        setgameScore("");
        setIsStaking(false);
        setStakeInput("");

        // const tx = await nftContract?.mintLevelNFT(address, lev, hash);
        // await tx.wait();

        const res = await fetch(`${api}/api/reset-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey: walletInfo?.address }),
        });

        if (!res.ok) throw new Error("Failed to fetch proof");

        // Show NFT mint success toast
        // toast.custom(
        //   (t: any) => (
        //     <div className={`${t.visible ? "animate-enter" : "animate-leave"}`}>
        //       <NFTMintSuccessToast level={lev - 1} />
        //     </div>
        //   ),
        //   {
        //     duration: 5000,
        //   }
        // );

        // handleLevelComplete();
        setGameEnded(false)
      }
    } catch (error) {

      setError("Withdrawal failed: " + (error as Error).message);
    } finally {
      // setIsLoading(false);
    }
  };

  const [showProfitEstimate, setShowProfitEstimate] = useState(false);
  useEffect(() => {
    if (walletInfo) {
      localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
    } else {
      localStorage.removeItem("walletInfo");
    }
  }, [walletInfo]); // Update localStorage whenever walletInfo changes

  const fetchStakedBalance = async (
    contractInstance: ethers.Contract,
    userAddress: string
  ) => {
    try {
      console.log("Fetching staked balance...");
      const balance = await contractInstance.getStakedBalance(userAddress);
      const formattedBalance = ethers.formatEther(balance);
      console.log("Staked balance:", formattedBalance);
      setStakeInput(formattedBalance);

      if (Number(formattedBalance) > 0) {
        setStakedAmount(Number(formattedBalance));
      }
    } catch (error) {
      console.error("Failed to fetch staked balance:", error);
      setError("Failed to fetch staked balance: " + (error as Error).message);
    }
  };
  const fetchGameScore = async () => {
    try {
      const response = await fetch(`${api}/api/message?publicKey=${walletInfo?.address}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      setgameScore(data.score.toString());

      console.log(data);
    } catch (error) {
      console.error("Failed to fetch User's Game Score:", error);
    }
  };
  // Sync isWalletConnected state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isWalletConnected", JSON.stringify(isWalletConnected));
    }
  }, [isWalletConnected]);
  useEffect(() => {
    localStorage.setItem("gameScore", gameScore.toString());
  }, [gameScore]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gameEnded", gameEnded.toString());
    }
  }, [gameEnded]);
  
  useEffect(() => {
    // Save expected score to localStorage whenever it changes
    if (typeof window !== "undefined" && expectedScore) {
      localStorage.setItem("expectedScore", expectedScore);
    }
  }, [expectedScore]);

  useEffect(() => {
    if (localStorage.getItem("gameOver") === "true") {
      console.log("Game Over detected. Restarting game...");
      setGameEnded(true)

      fetchGameScore()
      fetchCurrentlevel()
    }
  }, []);

  const fetchCurrentlevel = async()=>{
    const resp = await fetch(
      `${api}/api/User/current-level?publicKey=${walletInfo?.address}`
    );
    const temp = await resp.json();
    const lev = temp.level;
    console.log("level " + lev);
    setCurrentLevel(lev);
  }

  useEffect(() => {
    if (
      stakeInput &&
      Number(stakeInput) > 0 &&
      expectedScore &&
      Number(expectedScore) > 0
    ) {
      estimateProfit(Number(stakeInput), Number(expectedScore) / 100);
    } else {
      setEstimatedProfit(0);
    }
  }, [stakeInput, expectedScore]);

  const connectWallet = async () => {
    setError("");
    if (typeof window.ethereum !== "undefined") {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await ethProvider.getSigner();
        const userAddress = await signer.getAddress();
        const balanceBigInt = await ethProvider.getBalance(userAddress);
        const balance = Number(ethers.formatEther(balanceBigInt));

        setWalletInfo({ address: userAddress, balance });
        setProvider(ethProvider);

        const stakingContract = new ethers.Contract(
          STAKING_CONTRACT_ADDRESS,
          Staking,
          signer
        );
        setContract(stakingContract);

        await fetchStakedBalance(stakingContract, userAddress);

        console.log("Connected to wallet:", userAddress);
        setIsWalletConnected(true);

        try {
          const response = await fetch(`${api}/api/User/create-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: userAddress }),
          });

          if (!response.ok) throw new Error("Failed to Create User");
          console.log("User created or updated successfully");
        } catch (userError) {
          console.error("User creation error:", userError);
          // Continue even if user creation fails
        }
      } catch (error) {
        console.error("Wallet connection error:", error);
        setError("Connection failed: " + (error as Error).message);
      }
    } else {
      setError("MetaMask is not installed.");
    }
  };

  const estimateProfit = async (stakedAmount: number, score: number) => {
    if (stakedAmount <= 0 || score <= 0) {
      setEstimatedProfit(0);
      return;
    }

    setIsCalculatingProfit(true);
    setShowProfitEstimate(true);

    try {
      // Fallback to static calculation if API call fails
      let profit = 0;

      try {
        const response = await fetch(`${api}/get-core-price`);
        if (response.ok) {
          const data = await response.json();

          if (data?.price) {
            const corePrice = data.price;
            const referencePrice = 10; // The price where multiplier = 1

            // Calculate price-based multiplier (capped at 3)
            let priceMultiplier = Math.min(referencePrice / corePrice, 3);

            // Calculate score-based multiplier (assuming max score is 100)
            const scoreMultiplier = Math.min(score / 100, 1);

            // Combined multiplier
            const totalMultiplier = priceMultiplier * scoreMultiplier;

            // Calculate profit (5% base profit rate)
            profit = stakedAmount * totalMultiplier * 0.05;
          }
        } else {
          throw new Error("Failed to fetch price data");
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        // Fallback calculation
        const baseRate = 0.05; // 5% base rate
        const scoreMultiplier = Math.min(score / 100, 1);
        profit = stakedAmount * scoreMultiplier * baseRate;
      }

      setEstimatedProfit(profit);
      console.log("Estimated profit:", profit.toFixed(6), "ETH");
    } finally {
      setIsCalculatingProfit(false);
    }
  };

  const handleStake = async () => {
    if (!contract) {
      setError("Please connect wallet first");
      return;
    }

    if (!expectedScore || Number(expectedScore) <= 0) {
      setError("Please enter your expected score first");
      return;
    }

    if (!stakeInput || Number(stakeInput) <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    console.log("Staking with expected score:", expectedScore);
    setIsStaking(true);
    setError("");

    try {
      // Convert stakeInput from ETH to Wei
      const stakeAmountWei = ethers.parseEther(stakeInput);

      console.log("Sending transaction...");
      const tx = await contract.stake(expectedScore, {
        value: stakeAmountWei,
      });

      console.log("Transaction sent, waiting for confirmation...");
      await tx.wait();
      console.log("Staking successful!");

      // Update staked amount and other UI elements
      setStakedAmount(Number(stakeInput));

      // Refresh staked balance
      await fetchStakedBalance(contract, walletInfo?.address || "");

      // Update wallet balance
      if (walletInfo) {
        const newBalance = walletInfo.balance - Number(stakeInput);
        setWalletInfo({
          ...walletInfo,
          balance: newBalance,
        });
      }

      // Reset form fields
      setStakeInput("0");
      setEstimatedProfit(0);
      setExpectedScore("0");
      setShowProfitEstimate(false);
    } catch (error) {
      console.error("Staking error:", error);
      setError("Staking failed: " + (error as Error).message);
    } finally {
      setIsStaking(false);
    }
  };

  // Animation for falling Tetris blocks
  useEffect(() => {
    const colors = [
      "#00f0f0",
      "#f0a000",
      "#a000f0",
      "#f00000",
      "#00f000",
      "#0000f0",
      "#f0f000",
    ];

    const interval = setInterval(() => {
      const newBlock = {
        id: blockId,
        x: Math.floor(Math.random() * 80) + 10, // Random x position (10-90%)
        y: -10, // Start above the viewport
        color: colors[Math.floor(Math.random() * colors.length)],
      };

      setFallingBlocks((prev) => [...prev, newBlock]);
      setBlockId((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [blockId]);

  // Update falling blocks positions
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setFallingBlocks(
        (prev) =>
          prev
            .map((block) => ({
              ...block,
              y: block.y + 0.5,
            }))
            .filter((block) => block.y < 120) // Remove blocks that fell out of view
      );
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [fallingBlocks]);

  // Tetris block shapes
  const TetrisBlock = ({ color, type }: { color: string; type: number }) => {
    const shapes = [
      // I-block
      <div className="flex" key="i-block">
        <div
          className={`w-6 h-6 m-0.5 rounded-sm`}
          style={{ backgroundColor: color }}
        ></div>
        <div
          className={`w-6 h-6 m-0.5 rounded-sm`}
          style={{ backgroundColor: color }}
        ></div>
        <div
          className={`w-6 h-6 m-0.5 rounded-sm`}
          style={{ backgroundColor: color }}
        ></div>
        <div
          className={`w-6 h-6 m-0.5 rounded-sm`}
          style={{ backgroundColor: color }}
        ></div>
      </div>,
      // L-block
      <div className="flex flex-col" key="l-block">
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div className="w-6 h-6 m-0.5 opacity-0"></div>
        </div>
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div className="w-6 h-6 m-0.5 opacity-0"></div>
        </div>
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
        </div>
      </div>,
      // Square block
      <div className="flex flex-col" key="square-block">
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
        </div>
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
        </div>
      </div>,
      // T-block
      <div className="flex flex-col" key="t-block">
        <div className="flex">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
        </div>
        <div className="flex justify-center">
          <div
            className={`w-6 h-6 m-0.5 rounded-sm`}
            style={{ backgroundColor: color }}
          ></div>
        </div>
      </div>,
    ];

    return shapes[type % shapes.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
      {/* Background falling blocks */}
      {fallingBlocks.map((block) => (
        <motion.div
          key={block.id}
          className="absolute pointer-events-none"
          initial={{ x: `${block.x}%`, y: "-10%", rotate: 0, opacity: 0.7 }}
          animate={{ y: "120%", rotate: 360, opacity: 0.5 }}
          transition={{ duration: 15, ease: "linear" }}
          style={{ left: `${block.x}%` }}
        >
          <TetrisBlock color={block.color} type={block.id % 4} />
        </motion.div>
      ))}

      <div className="container mx-auto px-4 py-12 relative z-10">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            CORE BLITZ
          </h1>
          <p className="mt-4 text-xl text-gray-300">
            Connect, Stake, Play, Win!
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="bg-gray-800 bg-opacity-80 p-8 rounded-xl border border-purple-500 shadow-lg shadow-purple-500/20"
          >
            <h2 className="text-3xl font-bold mb-6 text-center text-purple-300">
              Game Info
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 w-6 h-6 rounded-sm"></div>
                <p>Clear lines to earn tokens</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 w-6 h-6 rounded-sm"></div>
                <p>Complete challenges for bonus rewards</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-pink-500 w-6 h-6 rounded-sm"></div>
                <p>Climb the leaderboard for special NFTs</p>
              </div>
            </div>

            <div className="my-8 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: [
                      "#00f0f0",
                      "#f0a000",
                      "#a000f0",
                      "#f00000",
                      "#00f000",
                      "#0000f0",
                      "#f0f000",
                      "#f0f0f0",
                    ][i % 8],
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            <motion.button
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all
                ${
                  stakedAmount > 0
                    ? "bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 shadow-lg shadow-blue-500/30"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              disabled={stakedAmount <= 0}
              onClick={() => router.push(`/game/index.html?level=${currentLevel}`)}
              whileHover={stakedAmount > 0 ? { scale: 1.05 } : {}}
              whileTap={stakedAmount > 0 ? { scale: 0.95 } : {}}
            >
              {stakedAmount > 0 ? "START GAME" : "Stake to Play"}
              {stakedAmount > 0 && (
                <motion.span
                  className="ml-2 inline-block"
                  animate={{ rotate: [0, 20, -20, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  🎮
                </motion.span>
              )}
            </motion.button>
            <motion.button
              className="w-full my-4 py-4 px-6 rounded-lg font-semibold text-lg transition-all border-2 border-blue-600 bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 hover:text-gray-200 hover:border-blue-700"
              onClick={() => router.push("/leaderBoard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Leaderboard
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="bg-gray-800 bg-opacity-80 p-8 rounded-xl border border-blue-500 shadow-lg shadow-blue-500/20"
          >
            <h2 className="text-3xl font-bold mb-6 text-center text-blue-300">
              Wallet Connection
            </h2>

            {!isWalletConnected ? (
              <motion.div
                className="text-center py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="mb-4 text-gray-300">
                  Connect your wallet to get started
                </p>
                <motion.button
                  className="py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                  onClick={connectWallet}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Connect Wallet
                </motion.button>
              </motion.div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 mb-1">Connected Wallet</p>
                    <p className="font-mono text-green-400">
                      {walletInfo?.address}
                    </p>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 mb-1">Balance</p>
                    <p className="text-xl font-bold">
                      {walletInfo?.balance.toFixed(4)} ETH
                    </p>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 mb-1">Staked Amount</p>
                    <p className="text-xl font-bold text-purple-400">
                      {stakedAmount.toFixed(4)} ETH
                    </p>
                  </div>

                  {/* Expected Score Input Section */}
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <label className="block text-gray-400 mb-2">
                      Expected Score (0-20000, multiples of 100)
                    </label>
                    <input
                      type="number"
                      value={expectedScore}
                      onChange={(e) => {
                        let value = Math.max(
                          0,
                          Math.min(20000, Number(e.target.value) || 0)
                        ); // Allow 0 - 20000
                        value = Math.round(value / 100) * 100; // Force it to be a multiple of 100
                        setExpectedScore(value.toString());
                      }}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                      max="20000"
                      step="100"
                    />
                  </div>

                  {/* Stake Input Section */}
                  <div className="mt-6">
                    <label className="block text-gray-300 mb-2">
                      Stake Amount (ETH)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={stakeInput}
                        onChange={(e) => setStakeInput(e.target.value)}
                        placeholder="Amount to stake"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.001"
                        min="0"
                        max={walletInfo?.balance || 0}
                      />
                      <motion.button
                        className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        onClick={handleStake}
                        disabled={
                          isStaking ||
                          !stakeInput ||
                          parseFloat(stakeInput) <= 0 ||
                          parseFloat(stakeInput) > (walletInfo?.balance || 0) ||
                          !expectedScore ||
                          Number(expectedScore) <= 0
                        }
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isStaking ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Staking...
                          </span>
                        ) : (
                          "Stake"
                        )}
                      </motion.button>
                    </div>

                    {/* Validation error messages */}
                    {walletInfo &&
                      parseFloat(stakeInput) > walletInfo.balance && (
                        <p className="text-red-500 mt-2">
                          Insufficient balance
                        </p>
                      )}

                    {error && (
                      <div className="flex items-center mt-2 text-red-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <p>{error}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <label className="block text-gray-300 mb-2">
                      Score of Game
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={gameScore}
                        // onChange={(e) => setStakeInput(e.target.value)}
                        readOnly
                        placeholder="Score of the Played Game"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        // step="0.001"
                        min="0"
                        // max={walletInfo?.balance || 0}
                      />
                      <motion.button
                        className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        onClick={handleWithdraw}
                        disabled={!gameEnded || Number(gameScore) < 0}
                        // whileHover={{ scale: 1.05 }}
                        // whileTap={{ scale: 0.95 }}
                      >
                        {/* {isStaking ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Staking...
                          </span>
                        ) : ( */}
                          Withdraw
                        {/* )} */}
                      </motion.button>
                    </div>

                    {/* Validation error messages */}
                    {walletInfo &&
                      parseFloat(stakeInput) > walletInfo.balance && (
                        <p className="text-red-500 mt-2">
                          Insufficient balance
                        </p>
                      )}

                    {error && (
                      <div className="flex items-center mt-2 text-red-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <p>{error}</p>
                      </div>
                    )}
                  </div>
                  {/* Profit Estimate Section */}
                  {showProfitEstimate && (
                    <motion.div
                      className="bg-gray-700 p-4 rounded-lg border border-green-500"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-gray-300">Estimated Profit:</p>
                        {isCalculatingProfit ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-400" />
                            <span>Calculating...</span>
                          </div>
                        ) : (
                          <p className="text-xl font-bold text-green-400">
                            {estimatedProfit.toFixed(6)} ETH
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Based on your expected score of {expectedScore}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400">
            © 2025 CORE BLITZ | Play to Earn | All Rights Reserved
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default TetrisHomePage;
