"use client"
import React, { useState, useEffect } from 'react';

export default function ChildLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [tetrisBlocks, setTetrisBlocks] = useState<Array<{
    id: number;
    x: number;
    y: number; 
    color: string;
    size: number;
    speed: number;
    rotation: number;
    shape: string;
  }>>([]);

  // Tetris block colors - brighter blues to increase visibility
  const blockColors = [
    '#1E88E5', // Bright blue
    '#2196F3', // Primary blue
    '#42A5F5', // Light blue
    '#64B5F6', // Lighter blue
    '#90CAF9', // Very light blue
    '#BBDEFB', // Palest blue
  ];

  // Tetris shapes
  const shapes = [
    'square', // O shape
    'line',   // I shape
    'tshape', // T shape
    'lshape', // L shape
    'zshape'  // Z shape
  ];

  // Initialize tetris blocks immediately
  useEffect(() => {
    // Initial blocks generation - positioned throughout the screen
    const initialBlocks = [];
    const blockCount = 25; // Increased number of blocks for more visibility
    
    for (let i = 0; i < blockCount; i++) {
      initialBlocks.push({
        id: i,
        x: Math.random() * 100, // Random x position (0-100%)
        y: Math.random() * 100, // Position throughout the entire viewport
        color: blockColors[Math.floor(Math.random() * blockColors.length)],
        size: Math.random() * 30 + 30, // Larger size between 30-60px
        speed: Math.random() * 0.3 + 0.1, // Slower speed for subtle movement
        rotation: Math.random() * 360, // Random initial rotation
        shape: shapes[Math.floor(Math.random() * shapes.length)] // Random tetris shape
      });
    }
    
    setTetrisBlocks(initialBlocks);
    
    // Animation loop to update block positions
    const animationInterval = setInterval(() => {
      setTetrisBlocks(prevBlocks => {
        return prevBlocks.map(block => {
          // Update y position
          let newY = block.y + block.speed;
          
          // Reset position if block goes off screen
          if (newY > 120) {
            newY = -20; // Reset to above viewport
            return {
              ...block,
              y: newY,
              x: Math.random() * 100, // New random x position
              rotation: Math.random() * 360, // New random rotation
              shape: shapes[Math.floor(Math.random() * shapes.length)], // New random shape
              color: blockColors[Math.floor(Math.random() * blockColors.length)], // New random color
            };
          }
          
          return {
            ...block,
            y: newY
          };
        });
      });
    }, 100); // Update more frequently for smoother animation
    
    return () => clearInterval(animationInterval);
  }, []);

  // Render the tetris shape based on its type
  const renderTetrisShape = (shape: string, size: number, color: string) => {
    // Add border to make blocks more visible
    const blockStyle = {
      backgroundColor: color,
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 0 10px rgba(0, 150, 255, 0.5)'
    };
    
    switch (shape) {
      case 'square':
        return (
          <div className="grid grid-cols-2 grid-rows-2" style={{width: size, height: size}}>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
          </div>
        );
      case 'line':
        return (
          <div className="grid grid-cols-1 grid-rows-4" style={{width: size/2, height: size*2}}>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
          </div>
        );
      case 'tshape':
        return (
          <div className="grid grid-cols-3 grid-rows-2" style={{width: size*1.5, height: size}}>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
          </div>
        );
      case 'lshape':
        return (
          <div className="grid grid-cols-2 grid-rows-3" style={{width: size, height: size*1.5}}>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
          </div>
        );
      case 'zshape':
        return (
          <div className="grid grid-cols-3 grid-rows-2" style={{width: size*1.5, height: size}}>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full opacity-0"></div>
            <div className="w-full h-full" style={blockStyle}></div>
            <div className="w-full h-full" style={blockStyle}></div>
          </div>
        );
      default:
        return (
          <div className="w-full h-full" style={blockStyle}></div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-950 to-blue-900 relative overflow-hidden">
      {/* Animated background tetris blocks */}
      {tetrisBlocks.map(block => (
        <div
          key={block.id}
          className="absolute pointer-events-none opacity-40 transition-all duration-1000"
          style={{
            left: `${block.x}%`,
            top: `${block.y}%`,
            transform: `rotate(${block.rotation}deg)`,
            filter: 'drop-shadow(0 0 8px rgba(0, 150, 255, 0.6))'
          }}
        >
          {renderTetrisShape(block.shape, block.size, block.color)}
        </div>
      ))}
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: 'linear-gradient(to right, #1E88E5 1px, transparent 1px), linear-gradient(to bottom, #1E88E5 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Content container */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Main content area with subtle glass effect */}
        <div className="bg-blue-950/80 backdrop-filter backdrop-blur-sm border border-blue-800/50 rounded-xl shadow-2xl p-6">
          {children}
        </div>
      </div>
      
      {/* Glow effects at the corners */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3"></div>
      
      {/* Additional subtle ambient glow */}
      <div className="absolute bottom-0 left-1/2 w-full h-1/3 bg-blue-400/5 rounded-full filter blur-3xl -translate-x-1/2"></div>
    </div>
  );
}