// game.js - Updated with Shooting Mechanism

let canvas, ctx;
let backgroundImage, playerImage, enemyImage;
let score = 0;
let lives = 3;
let level = 1;
let gameLoop;
let player, enemies, bullets = [];
let keys = {};
let lastShotTime = 0;
const shootingCooldown = 300; // Cooldown for shooting

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
        if (this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
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

class Bullet extends GameObject {
    constructor(x, y) {
        super(x, y, 5, 10, null);
        this.speed = 7;
    }

    move() {
        this.y -= this.speed;
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

    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        const now = Date.now();
        if (e.code === 'Space' && now - lastShotTime > shootingCooldown) {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
            lastShotTime = now;
        }
    });
    document.addEventListener('keyup', (e) => keys[e.code] = false);

    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', restartGame);
}

function startGame() {
    startScreen.style.display = 'none';
    gameLoop = requestAnimationFrame(update);
}

function update() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    player.move();
    player.draw();

    bullets = bullets.filter(bullet => bullet.y > 0); // Remove bullets out of bounds
    bullets.forEach((bullet, index) => {
        bullet.move();
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                resetEnemyPosition(enemy);
                score += 100;
                scoreValue.textContent = score;
                bullets.splice(index, 1);
            }
        });
    });

    enemies.forEach((enemy) => {
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
    gameOverScreen.style.display = 'flex';
    finalScoreValue.textContent = score;
}

function restartGame() {
    score = 0;
    lives = 3;
    level = 1;
    scoreValue.textContent = score;
    livesValue.textContent = lives;
    levelValue.textContent = level;
    gameOverScreen.style.display = 'none';
    initGame();
    startGame();
}

window.addEventListener('load', initGame);