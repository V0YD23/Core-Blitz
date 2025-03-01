"use client"
import React, { useState, useEffect } from 'react';
import { ArrowUpDown, Trophy, Medal, Award } from 'lucide-react';

const TetrisLeaderboard = () => {
  const api = process.env.NEXT_PUBLIC_BACKEND_API;
  // const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [players, setPlayers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Simulated API fetch
  // useEffect(() => {
  //   const fetchData = async () => {
  //     setLoading(true);
  //     // In a real app, replace this with your actual API call
  //     // e.g.: const response = await fetch('/api/leaderboard');
      
  //     // Simulated API data
  //     const sampleData:any = [
  //       { id: 1, username: "TetrisMaster", score: 283450, level: 22, lines: 206 },
  //       { id: 2, username: "BlockWizard", score: 256780, level: 20, lines: 189 },
  //       { id: 3, username: "LineCleared", score: 298620, level: 23, lines: 219 },
  //       { id: 4, username: "TetrisKing", score: 342100, level: 26, lines: 252 },
  //       { id: 5, username: "FallingBlocks", score: 187340, level: 16, lines: 143 },
  //       { id: 6, username: "RowCrusher", score: 231560, level: 18, lines: 175 },
  //       { id: 7, username: "TetrominoLord", score: 312890, level: 24, lines: 230 },
  //       { id: 8, username: "StackMaster", score: 276430, level: 21, lines: 192 },
  //       { id: 9, username: "TSpinPro", score: 324760, level: 25, lines: 241 },
  //       { id: 10, username: "BlockDropper", score: 198520, level: 17, lines: 152 },
  //     ];
      
  //     // Delay to simulate network request
  //     setTimeout(() => {
  //       setPlayers(sampleData);
  //       setLoading(false);
  //     }, 1500);
  //   };
    
  //   fetchData();
  // }, []);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${api}/api/leaderboard`); // Ensure this is the correct API endpoint
        if (!response.ok) throw new Error("Failed to fetch leaderboard data");

        const data = await response.json();
        const formattedData = data.map((player: any, index: number) => ({
          id: player._id,
          username: player.username,
          games_won: player.games_won ?? 0, // Ensure it's not undefined
          games_lost: player.games_lost ?? 0,
          level: player.level ?? 1,
        }));
  
        setPlayers(formattedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Sort players by score
  const sortedPlayers = [...players].sort((a:any, b:any) => 
    sortOrder === 'desc' ? b.score - a.score : a.score - b.score
  );

  // Toggle sort order
  const toggleSort = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  // Tetris block animation component
  const TetrisBlock = ({ delay, color }:any) => {
    const [active, setActive] = useState(false);
    
    useEffect(() => {
      const timer = setTimeout(() => {
        setActive(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }, [delay]);
    
    return (
      <div 
        className={`w-4 h-4 mx-0.5 transition-all duration-500 transform ${
          active ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'
        }`}
        style={{ backgroundColor: color }}
      />
    );
  };

  // Tetris animation for rank badges
  const RankBadge = ({ rank }:any) => {
    var icon, color
    
    if (rank === 1) {
      icon = <Trophy className="h-6 w-6 text-yellow-400" />;
      color = "bg-yellow-500";
    } else if (rank === 2) {
      icon = <Medal className="h-6 w-6 text-gray-300" />;
      color = "bg-gray-400";
    } else if (rank === 3) {
      icon = <Award className="h-6 w-6 text-amber-600" />;
      color = "bg-amber-700";
    } else {
      return <div className="flex justify-center items-center h-10 w-10 text-blue-200 font-bold">{rank}</div>;
    }
    
    return (
      <div className="relative flex justify-center items-center h-10 w-10">
        {icon}
        <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
          <div className={`h-1 w-6 ${color} rounded-full`}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-blue-950 rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-auto text-blue-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-blue-100 flex items-center">
          <div className="flex mr-2">
            {['#1E88E5', '#1976D2', '#1565C0', '#0D47A1'].map((color, i) => (
              <TetrisBlock key={i} delay={i * 120} color={color} />
            ))}
          </div>
          Core Blitz Leaderboard
        </h2>
        <button 
          onClick={toggleSort}
          className="flex items-center bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <span className="mr-2">Sort</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-10">
          <div className="flex mb-4">
            {['#1E88E5', '#1976D2', '#1565C0', '#0D47A1', '#1E88E5', '#1976D2'].map((color, i) => (
              <TetrisBlock key={i} delay={i * 150 + 100} color={color} />
            ))}
          </div>
          <div className="flex">
            {['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#0D47A1', '#1565C0'].map((color, i) => (
              <TetrisBlock key={i} delay={i * 150 + 200} color={color} />
            ))}
          </div>
          <p className="mt-4 text-blue-300">Loading leaderboard data...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-blue-800">
          <table className="min-w-full divide-y divide-blue-800">
            <thead className="bg-blue-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider w-16">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Player</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Level</th>
                {/* <th className="px-6 py-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Lines</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-800">
              {sortedPlayers.map((player:any, index) => (
                <tr 
                  key={player.id}
                  className={`${index % 2 === 0 ? 'bg-blue-900/50' : 'bg-blue-900/30'} hover:bg-blue-800 transition-all duration-200`}
                  style={{ 
                    animation: `slideIn 0.5s ease ${index * 0.1}s forwards`,
                    opacity: 0,
                    transform: 'translateY(20px)'
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RankBadge rank={index + 1} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{player.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100 font-mono">
                    {player.games_won}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{player.level}</span>
                      <div className="h-2 w-24 bg-blue-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-300" 
                          style={{ width: `${Math.min(100, player.level * 4)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">{player.lines}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TetrisLeaderboard;