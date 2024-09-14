// game.js - Fixed Game Logic for Ultimate Galactic Space Fighter

let canvas, ctx;
let backgroundImage, playerImage, enemyImage;
let score = 0;
let lives = 3;
let level = 1;
let gameLoop;
let player, enemies;
let keys = {};

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const playAgainButton = document.getElementById('play-again-button');
const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const levelValue = document.getElementById('levelValue');
const finalScoreValue = document.getElementById('finalScoreValue');

class GameObject {
    constructor(x, y, width, height, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 50, 50, playerImage);
        this.speed = 5;
    }

    move() {
        if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;
        if (keys.ArrowRight && this.x < canvas.width - this.width) this.x += this.speed;
    }
}

class Enemy extends GameObject {
    constructor(x, y) {
        super(x, y, 50, 50, enemyImage);
        this.speed = 2 + Math.random() * 2;
    }

    move() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = -this.height;
            this.x = Math.random() * (canvas.width - this.width);
            lives--;
            livesValue.textContent = lives;
            if (lives <= 0) gameOver();
        }
    }
}

function loadImages() {
    return new Promise((resolve) => {
        backgroundImage = new Image();
        playerImage = new Image();
        enemyImage = new Image();

        let loadedImages = 0;
        const totalImages = 3;

        function onImageLoad() {
            loadedImages++;
            if (loadedImages === totalImages) {
                resolve();
            }
        }

        backgroundImage.onload = onImageLoad;
        playerImage.onload = onImageLoad;
        enemyImage.onload = onImageLoad;

        // Updated image paths
        backgroundImage.src = 'img/space-background.png';
        playerImage.src = 'img/player-ship.png';
        enemyImage.src = 'img/enemy-ship.png';
    });
}


async function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    await loadImages();

    player = new Player(canvas.width / 2 - 25, canvas.height - 70);
    enemies = [];

    for (let i = 0; i < 5; i++) {
        enemies.push(new Enemy(Math.random() * (canvas.width - 50), Math.random() * -300));
    }

    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);
    
    // Ensure startButton is correctly selected and add event listener
    if (startButton) {
        startButton.addEventListener('click', startGame);
    } else {
        console.error('Start button not found');
    }
    
    if (playAgainButton) {
        playAgainButton.addEventListener('click', restartGame);
    } else {
        console.error('Play Again button not found');
    }
}

function startGame() {
    if (startScreen) {
        startScreen.style.display = 'none';
    } else {
        console.error('Start screen not found');
    }
    gameLoop = requestAnimationFrame(update);
}

function update() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    player.move();
    player.draw();

    enemies.forEach((enemy, index) => {
        enemy.move();
        enemy.draw();

        if (checkCollision(player, enemy)) {
            lives--;
            livesValue.textContent = lives;
            if (lives <= 0) {
                gameOver();
            } else {
                resetEnemyPosition(enemy);
            }
        }
    });

    score++;
    scoreValue.textContent = score;

    if (score % 1000 === 0) {
        level++;
        levelValue.textContent = level;
        enemies.push(new Enemy(Math.random() * (canvas.width - 50), Math.random() * -300));
    }

    gameLoop = requestAnimationFrame(update);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function resetEnemyPosition(enemy) {
    enemy.y = -enemy.height;
    enemy.x = Math.random() * (canvas.width - enemy.width);
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    } else {
        console.error('Game Over screen not found');
    }
    finalScoreValue.textContent = score;
}

function restartGame() {
    score = 0;
    lives = 3;
    level = 1;
    scoreValue.textContent = score;
    livesValue.textContent = lives;
    levelValue.textContent = level;
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    } else {
        console.error('Game Over screen not found');
    }
    initGame();
    startGame();
}

window.addEventListener('load', initGame);