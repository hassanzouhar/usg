// game.js - Updated with Shooting Mechanism

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 7;
const SHOOTING_COOLDOWN = 300;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_LIVES = 3;
const INITIAL_SCORE = 0;
const INITIAL_LEVEL = 1;
const ENEMY_SPEED_MIN = 2;
const ENEMY_SPEED_MAX = 4;

const game = {
    canvas: null,
    ctx: null,
    score: INITIAL_SCORE,
    lives: INITIAL_LIVES,
    level: INITIAL_LEVEL,
    player: null,
    enemies: [],
    bullets: [],
    keys: {},
    lastShotTime: 0,
    gameLoop: null,
};

let backgroundImage, playerImage, enemyImage;
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
            game.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 50, 50, playerImage);
        this.speed = 5;
    }

    move() {
        if (game.keys.ArrowLeft && this.x > 0) this.x -= this.speed;
        if (game.keys.ArrowRight && this.x < game.canvas.width - this.width) this.x += this.speed;
    }
}

class Enemy extends GameObject {
    constructor(x, y) {
        super(x, y, ENEMY_WIDTH, ENEMY_HEIGHT, enemyImage);
        this.resetPosition();
    }

    resetPosition() {
        this.y = -this.height;
        this.x = Math.random() * (game.canvas.width - this.width);
        this.speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN);
    }

    move() {
        this.y += this.speed;
        if (this.y > game.canvas.height) {
            this.resetPosition();
            game.lives--;
            livesValue.textContent = game.lives;
            if (game.lives <= 0) gameOver();
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
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = 800;
    game.canvas.height = 600;

    await loadImages();

    game.player = new Player(game.canvas.width / 2 - 25, game.canvas.height - 70);
    game.enemies = [];
    for (let i = 0; i < 5; i++) {
        game.enemies.push(new Enemy(Math.random() * (game.canvas.width - 50), Math.random() * -300));
    }

    document.addEventListener('keydown', (e) => {
        game.keys[e.code] = true;
        const now = Date.now();
        if (e.code === 'Space' && now - game.lastShotTime > shootingCooldown) {
            game.bullets.push(new Bullet(game.player.x + game.player.width / 2 - 2.5, game.player.y));
            game.lastShotTime = now;
        }
    });
    document.addEventListener('keyup', (e) => game.keys[e.code] = false);

    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', restartGame);
}

function startGame() {
    startScreen.style.display = 'none';
    game.gameLoop = requestAnimationFrame(update);
}

function updateGameLogic() {
    game.player.move();
    game.bullets = game.bullets.filter(bullet => bullet.y > 0);
    game.bullets.forEach((bullet, index) => {
        bullet.move();
        game.enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                resetEnemyPosition(enemy);
                game.score += 100;
                scoreValue.textContent = game.score;
                game.bullets.splice(index, 1);
            }
        });
    });

    game.enemies.forEach((enemy) => {
        enemy.move();
        if (checkCollision(game.player, enemy)) {
            game.lives--;
            livesValue.textContent = game.lives;
            if (game.lives <= 0) {
                gameOver();
            } else {
                resetEnemyPosition(enemy);
            }
        }
    });

    game.score++;
    scoreValue.textContent = game.score;

    if (game.score % 1000 === 0) {
        game.level++;
        levelValue.textContent = game.level;
        game.enemies.push(new Enemy(Math.random() * (game.canvas.width - 50), Math.random() * -300));
    }
}

function renderGame() {
    game.ctx.drawImage(backgroundImage, 0, 0, game.canvas.width, game.canvas.height);
    game.player.draw();
    game.bullets.forEach(bullet => {
        game.ctx.fillStyle = 'yellow';
        game.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    game.enemies.forEach(enemy => enemy.draw());
}

function update() {
    updateGameLogic();
    renderGame();
    game.gameLoop = requestAnimationFrame(update);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj2.height > obj2.y;
}

function resetEnemyPosition(enemy) {
    enemy.resetPosition();
}

function gameOver() {
    cancelAnimationFrame(game.gameLoop);
    gameOverScreen.style.display = 'flex';
    finalScoreValue.textContent = game.score;
}

function restartGame() {
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    scoreValue.textContent = game.score;
    livesValue.textContent = game.lives;
    levelValue.textContent = game.level;
    gameOverScreen.style.display = 'none';
    initGame();
    startGame();
}

window.addEventListener('load', initGame);