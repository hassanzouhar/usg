// game.js - Updated with Shooting Mechanism

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 7;
const SHOOTING_COOLDOWN = 100;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_LIVES = 3;
const INITIAL_SCORE = 0;
const INITIAL_LEVEL = 1;
const ENEMY_SPEED_MIN = 1;
const ENEMY_SPEED_MAX = 2;
const ENEMY_SPAWN_INTERVAL = 2000; // Spawn enemies every 2 seconds

const DIFFICULTY_INCREASE_INTERVAL = 30000; // 30 seconds
const MAX_ENEMIES = 10;
const ENEMY_SPEED_INCREASE = 0.2;
let lastDifficultyIncrease = 0;

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
    playerName: '',
    powerUps: [],
    powerUpActive: null,
    powerUpDuration: 5000,
    powerUpTimer: null,
    scoreMultiplier: 1,
    combo: 0,
    comboTimer: null,
    highScores: JSON.parse(localStorage.getItem('highScores')) || []
};

let backgroundImage, playerImage, enemyImage;
const shootingCooldown = 150; // Cooldown for shooting
let lastEnemySpawnTime = 0;
const explosions = [];

const sounds = {
    shoot: new Audio('sounds/shoot.wav'),
    explosion: new Audio('sounds/explosion.wav'),
    powerUp: new Audio('sounds/powerup.wav'),
    gameOver: new Audio('sounds/gameover.wav')
};

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const playAgainButton = document.getElementById('play-again-button');
const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const levelValue = document.getElementById('levelValue');
const finalScoreValue = document.getElementById('finalScoreValue');
const playerNameInput = document.getElementById('player-name');

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
        const diagonalSpeed = this.speed * 0.707; // For diagonal movement
        
        if (game.keys.ArrowLeft && game.keys.ArrowUp && this.x > 0 && this.y > 0) {
            this.x -= diagonalSpeed;
            this.y -= diagonalSpeed;
        } else if (game.keys.ArrowLeft && game.keys.ArrowDown && this.x > 0 && this.y < game.canvas.height - this.height) {
            this.x -= diagonalSpeed;
            this.y += diagonalSpeed;
        } else if (game.keys.ArrowRight && game.keys.ArrowUp && this.x < game.canvas.width - this.width && this.y > 0) {
            this.x += diagonalSpeed;
            this.y -= diagonalSpeed;
        } else if (game.keys.ArrowRight && game.keys.ArrowDown && this.x < game.canvas.width - this.width && this.y < game.canvas.height - this.height) {
            this.x += diagonalSpeed;
            this.y += diagonalSpeed;
        } else {
            if (game.keys.ArrowLeft && this.x > 0) this.x -= this.speed;
            if (game.keys.ArrowRight && this.x < game.canvas.width - this.width) this.x += this.speed;
            if (game.keys.ArrowUp && this.y > 0) this.y -= this.speed;
            if (game.keys.ArrowDown && this.y < game.canvas.height - this.height) this.y += this.speed;
        }
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

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 30;
        this.expansionRate = 2;
        this.opacity = 1;
        this.fadeRate = 0.05;
    }

    update() {
        if (this.radius < this.maxRadius) {
            this.radius += this.expansionRate;
        }
        if (this.opacity > 0) {
            this.opacity -= this.fadeRate;
        }
    }

    draw(ctx) {
        if (this.opacity > 0) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'orange';
            ctx.fill();
            ctx.restore();
        }
    }

    isFinished() {
        return this.opacity <= 0;
    }
}

class PowerUp extends GameObject {
    constructor(x, y, type) {
        super(x, y, 30, 30, null);
        this.type = type; // 'shield', 'rapidFire', 'multiShot'
        this.speed = 2;
    }

    move() {
        this.y += this.speed;
    }

    draw() {
        game.ctx.fillStyle = this.type === 'shield' ? 'blue' : 
                            this.type === 'rapidFire' ? 'red' : 'green';
        game.ctx.beginPath();
        game.ctx.arc(this.x + 15, this.y + 15, 15, 0, Math.PI * 2);
        game.ctx.fill();
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
    game.canvas.width = CANVAS_WIDTH;
    game.canvas.height = CANVAS_HEIGHT;

    await loadImages();

    game.player = new Player(game.canvas.width / 2 - PLAYER_WIDTH / 2, game.canvas.height - PLAYER_HEIGHT - 20);
    game.enemies = [];
    lastEnemySpawnTime = Date.now();

    document.addEventListener('keydown', (e) => {
        game.keys[e.code] = true;
        const now = Date.now();
        if (e.code === 'Space' && now - game.lastShotTime > shootingCooldown) {
            game.bullets.push(new Bullet(game.player.x + game.player.width / 2 - BULLET_WIDTH / 2, game.player.y));
            game.lastShotTime = now;
            sounds.shoot.currentTime = 0;
            sounds.shoot.play();
        }
    });
    document.addEventListener('keyup', (e) => game.keys[e.code] = false);

    startButton.addEventListener('click', () => {
        game.playerName = playerNameInput.value || 'Player';
        startGame();
    });
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
                updateScore(100); // Increment score when an enemy is destroyed
                game.bullets.splice(index, 1);
                explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)); // Add explosion
                sounds.explosion.currentTime = 0;
                sounds.explosion.play();
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

    updateEnemySpawning(); // Call the enemy spawning logic
    updateDifficulty(); // Call the difficulty update logic

    // Update explosions
    explosions.forEach((explosion, index) => {
        explosion.update();
        if (explosion.isFinished()) {
            explosions.splice(index, 1);
        }
    });

    // Increment score based on time survived
    if (game.score % 1000 === 0 && game.score !== 0) {
        game.level++;
        levelValue.textContent = game.level;
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
    explosions.forEach(explosion => explosion.draw(game.ctx)); // Draw explosions
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
    updateHighScores();
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

function spawnEnemy() {
    const enemy = new Enemy(Math.random() * (game.canvas.width - ENEMY_WIDTH), Math.random() * -300);
    game.enemies.push(enemy);
}

function updateEnemySpawning() {
    const now = Date.now();
    if (now - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
        spawnEnemy();
        lastEnemySpawnTime = now;
    }
}

function updateDifficulty() {
    const now = Date.now();
    if (now - lastDifficultyIncrease > DIFFICULTY_INCREASE_INTERVAL) {
        ENEMY_SPEED_MIN += ENEMY_SPEED_INCREASE;
        ENEMY_SPEED_MAX += ENEMY_SPEED_INCREASE;
        if (ENEMY_SPAWN_INTERVAL > 1000) {
            ENEMY_SPAWN_INTERVAL -= 100;
        }
        lastDifficultyIncrease = now;
    }
}

function updateScore(points) {
    game.combo++;
    clearTimeout(game.comboTimer);
    game.comboTimer = setTimeout(() => game.combo = 0, 2000);
    
    const finalScore = points * game.scoreMultiplier * (1 + game.combo * 0.1);
    game.score += Math.floor(finalScore);
    scoreValue.textContent = game.score;
}

function updateHighScores() {
    const score = {
        name: game.playerName,
        score: game.score,
        date: new Date().toISOString()
    };
    
    game.highScores.push(score);
    game.highScores.sort((a, b) => b.score - a.score);
    game.highScores = game.highScores.slice(0, 10);
    
    localStorage.setItem('highScores', JSON.stringify(game.highScores));
}

window.addEventListener('load', initGame);