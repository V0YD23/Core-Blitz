// script.js
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const rotateButton = document.getElementById('rotate');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');
const walletInfo = localStorage.getItem("walletInfo");

if (walletInfo) {
  const parsedWalletInfo = JSON.parse(walletInfo);
  const address = parsedWalletInfo.address;
  console.log(address); // Now it will correctly log "0x6E12FebE5Ad02f4acA0923FF58E2B2064491a66a"
}

const rows = 20;
const cols = 10;
const blockSize = 30;

let board = [];
let currentPiece = null;
let currentPieceColor = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let level = 1;
let gameRunning = false;
let dropInterval = 1000; // Initial drop interval

const pieces = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // Z
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]]  // J
];

const colors = [
    'cyan',
    'yellow',
    'purple',
    'red',
    'green',
    'orange',
    'blue'
];

function initBoard() {
    for (let y = 0; y < rows; y++) {
        board[y] = [];
        for (let x = 0; x < cols; x++) {
            board[y][x] = 0;
        }
    }
}

function newPiece() {
    const randomIndex = Math.floor(Math.random() * pieces.length);
    currentPiece = pieces[randomIndex];
    currentPieceColor = colors[randomIndex];
    currentX = Math.floor(cols / 2) - Math.floor(currentPiece[0].length / 2);
    currentY = 0;
    if (checkCollision(currentX, currentY)) {
        gameOver();
    }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before redrawing
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            } else {
              drawBlock(x,y, '#111')
            }
        }
    }
    if (currentPiece) {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    drawBlock(currentX + x, currentY + y, currentPieceColor);
                }
            }
        }
    }
}

function checkCollision(x, y, piece = currentPiece) {
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                const newX = x + col;
                const newY = y + row;
                if (newX < 0 || newX >= cols || newY >= rows || (newY >=0 && board[newY][newX])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function mergePiece() {
    for (let y = 0; y < currentPiece.length; y++) {
        for (let x = 0; x < currentPiece[y].length; x++) {
            if (currentPiece[y][x]) {
                board[currentY + y][currentX + x] = currentPieceColor;
            }
        }
    }
}

async function clearLines() {
    let linesCleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        if (board[y].every(cell => cell)) {
            linesCleared++;
            board.splice(y, 1);
            board.unshift(Array(cols).fill(0));
        }
    }
    
    if (linesCleared > 0) {
        score += linesCleared * 100 * level;
        scoreDisplay.textContent = score;

        if (score >= level * 1000) {
            level++;
            levelDisplay.textContent = level;
            dropInterval *= 0.8; // Increase speed
        }
        const parsedWalletInfo = JSON.parse(walletInfo);
        const address = parsedWalletInfo.address;
        console.log(address); // Now it will correctly log "0x6E12FebE5Ad02f4acA0923FF58E2B2064491a66a"
        // Fetch the address from localStorage
        if (address) {
            try {
                const response = await fetch("http://localhost:5000/api/message", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({score:score,publicKey:address}),
                });

                const data = await response.json();
                console.log("Score update response:", data);
            } catch (error) {
                console.error("Error sending score update:", error);
            }
        } else {
            console.warn("No user address found in localStorage.");
        }
    }
}


function moveDown() {
    if (!checkCollision(currentX, currentY + 1)) {
        currentY++;
    } else {
        mergePiece();
        clearLines();
        newPiece();
    }
}

function moveLeft() {
    if (!checkCollision(currentX - 1, currentY)) {
        currentX--;
    }
}

function moveRight() {
    if (!checkCollision(currentX + 1, currentY)) {
        currentX++;
    }
}

function rotatePiece() {
    const rotatedPiece = currentPiece[0].map((val, index) => currentPiece.map(row => row[index]).reverse());
    if (!checkCollision(currentX, currentY, rotatedPiece)) {
        currentPiece = rotatedPiece;
    }
}

function gameOver() {
    gameRunning = false;
    localStorage.setItem("gameOver", "true"); // Store game over status
    alert('Game Over! Score: ' + score);
    window.location.href = "/"; // Redirect to home (fix syntax)
    initGame();
}

let dropTimer;

function gameLoop() {
    if (gameRunning) {
        moveDown();
        drawBoard();
        dropTimer = setTimeout(gameLoop, dropInterval);
    }
}

function initGame() {
    initBoard();
    newPiece();

    // Fetch level from localStorage or default to 1
    level = localStorage.getItem("currentLevel") ? Number(localStorage.getItem("currentLevel")) : 1;
    score = 0;
    dropInterval = 1000;

    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    clearTimeout(dropTimer);
}

pauseButton.addEventListener('click',()=>{
    if(gameRunning){
        gameRunning=false;
        clearTimeout(dropTimer)
    }
})

startButton.addEventListener('click', () => {
    if (!gameRunning) {
        if(board[0].some(cell=> cell!==0)){
          initGame();
        }
        gameRunning = true;
        gameLoop();
    } 
    // else {
    //     gameRunning = false;
    //     clearTimeout(dropTimer);
    // }
});

rotateButton.addEventListener('click', () => {
    if (gameRunning) {
        rotatePiece();
        drawBoard();
    }
});

document.addEventListener('keydown', (event) => {
    if (gameRunning) {
        switch (event.key) {
            case 'ArrowLeft':
                moveLeft();
                drawBoard();
                break;
            case 'ArrowRight':
                moveRight();
                drawBoard();
                break;
            case 'ArrowDown':
                moveDown();
                drawBoard();
                break;
            case 'ArrowUp':
                rotatePiece();
                drawBoard();
                break;
        }
    }
});

initGame();
drawBoard();