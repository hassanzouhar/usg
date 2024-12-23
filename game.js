import { supabase, saveHighScore, getHighScores } from './supabase.js';

// Game Constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 7;
const SHOOTING_COOLDOWN = 150;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_LIVES = 3;
const INITIAL_SCORE = 0;
const INITIAL_LEVEL = 1;
const DIFFICULTY_INCREASE_INTERVAL = 30000;
const MAX_ENEMIES = 10;
const ENEMY_SPEED_INCREASE = 0.2;
const SOUND_POOL_SIZE = 5;
const AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
const POWERUP_SPAWN_INTERVAL = 15000; // First power-up after 15 seconds, then regularly
const POWERUP_SPAWN_CHANCE = 0.2; // 20% chance to spawn when interval is met
const POWERUP_WIDTH = 30;
const POWERUP_HEIGHT = 30;

const POWERUP_TYPES = {
    'shield': {
        type: 'shield',
        duration: 5000,
        color: 'blue',
        effect: (player) => player.hasShield = true,
        remove: (player) => player.hasShield = false
    },
    'multishot': { // Changed from multiShot to multishot
        type: 'multishot',
        duration: 5000,
        color: 'green',
        effect: (player) => player.hasMultiShot = true,
        remove: (player) => player.hasMultiShot = false
    },
    'rapidfire': { // Changed from rapidFire to rapidfire
        type: 'rapidfire',
        duration: 5000,
        color: 'red',
        effect: (player) => player.cooldownReduction = 0.5,
        remove: (player) => player.cooldownReduction = 1
    }
};

// Global variables
let lastDifficultyIncrease = 0;
let lastEnemySpawnTime = 0;
const explosions = [];

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
    highScores: [],
    isLoadingScores: false,
    enemySpawnInterval: 2000,
    enemySpeedMin: 1,
    enemySpeedMax: 2,
    assets: {
        backgroundImage: null,
        playerImage: null,
        enemyImage: null
    },
    isGameActive: false,
    keydownListener: null,
    keyupListener: null,
    lastPowerUpSpawn: 0
};

// Asset loading and game initialization will be handled by loadGame() function

// Create SoundPool class
class SoundPool {
    constructor(audioBuffer, poolSize) {
        this.audioBuffer = audioBuffer;
        this.sources = Array(poolSize).fill(null);
        this.currentIndex = 0;
    }

    play() {
        // Create new source
        const source = AUDIO_CONTEXT.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(AUDIO_CONTEXT.destination);
        
        // Clean up old source if it exists
        if (this.sources[this.currentIndex]) {
            this.sources[this.currentIndex].disconnect();
        }
        
        // Store and play new source
        this.sources[this.currentIndex] = source;
        source.start(0);
        
        // Move to next slot in pool
        this.currentIndex = (this.currentIndex + 1) % this.sources.length;
    }
}

// Replace sounds object with SoundManager
class SoundManager {
    constructor() {
        this.buffers = {};
        this.sounds = {};
        this.muted = false;
    }

    async loadSound(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await AUDIO_CONTEXT.decodeAudioData(arrayBuffer);
        this.buffers[name] = audioBuffer;
        this.sounds[name] = new SoundPool(audioBuffer, SOUND_POOL_SIZE);
    }

    async init() {
        await Promise.all([
            this.loadSound('shoot', 'sounds/shoot.wav'),
            this.loadSound('explosion', 'sounds/explosion.wav'),
            this.loadSound('powerUp', 'sounds/powerup.wav'),
            this.loadSound('gameOver', 'sounds/gameover.wav')
        ]);
    }

    play(soundName) {
        if (this.muted || !this.sounds[soundName]) return;
        this.sounds[soundName].play();
    }

    toggleMute() {
        this.muted = !this.muted;
    }
}

// Replace sounds constant with SoundManager instance
const soundManager = new SoundManager();

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
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
        super(x, y, PLAYER_WIDTH, PLAYER_HEIGHT, game.assets.playerImage);
        this.speed = 5;
        this.hasMultiShot = false;
        this.hasRapidFire = false;
        this.cooldownReduction = 1; // 1 = normal, 0.5 = twice as fast
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
        super(x, y, ENEMY_WIDTH, ENEMY_HEIGHT, game.assets.enemyImage);
        this.resetPosition();
    }

    resetPosition() {
        this.y = -this.height;
        this.x = Math.random() * (game.canvas.width - this.width);
        this.speed = game.enemySpeedMin + Math.random() * (game.enemySpeedMax - game.enemySpeedMin);
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
        super(x, y, BULLET_WIDTH, BULLET_HEIGHT, null);
        this.speed = BULLET_SPEED;
        this.angle = 0;
    }

    move() {
        const radians = this.angle * Math.PI / 180;
        this.x += Math.sin(radians) * this.speed;
        this.y -= Math.cos(radians) * this.speed;
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
        // Normalize type to lowercase for comparison
        const normalizedType = type.toLowerCase();
        if (!POWERUP_TYPES[normalizedType]) {
            console.error(`Invalid powerup type: ${type}`);
            type = 'shield'; // Default to shield if invalid type
        }
        const powerUpConfig = POWERUP_TYPES[normalizedType];
        super(x, y, POWERUP_WIDTH, POWERUP_HEIGHT, game.assets[`${type}PowerUp`]);
        this.type = normalizedType;
        this.speed = 2;
        this.config = powerUpConfig;
    }

    move() {
        this.y += this.speed;
    }

    draw() {
        super.draw();
        if (this.config && this.config.color) {
            game.ctx.beginPath();
            game.ctx.arc(this.x + POWERUP_WIDTH/2, this.y + POWERUP_HEIGHT/2, 
                        POWERUP_WIDTH * 0.6, 0, Math.PI * 2);
            game.ctx.strokeStyle = this.config.color;
            game.ctx.stroke();
        }
    }

    activate(player) {
        if (!this.config || !this.config.effect) return;
        
        this.config.effect(player);
        game.powerUpActive = this.type;
        game.powerUpStartTime = Date.now();
        
        if (game.powerUpTimer) {
            clearTimeout(game.powerUpTimer);
        }
        
        game.powerUpTimer = setTimeout(() => {
            if (this.config.remove) {
                this.config.remove(player);
            }
            game.powerUpActive = null;
        }, this.config.duration || 5000);
        
        soundManager.play('powerUp');
    }
}

function loadImages() {
    return new Promise((resolve) => {
        game.assets.backgroundImage = new Image();
        game.assets.playerImage = new Image();
        game.assets.enemyImage = new Image();
        game.assets.shieldPowerUp = new Image();
        game.assets.rapidFirePowerUp = new Image();
        game.assets.multiShotPowerUp = new Image();

        let loadedImages = 0;
        const totalImages = 6;

        function onImageLoad() {
            loadedImages++;
            if (loadedImages === totalImages) {
                resolve();
            }
        }

        game.assets.backgroundImage.onload = onImageLoad;
        game.assets.playerImage.onload = onImageLoad;
        game.assets.enemyImage.onload = onImageLoad;
        game.assets.shieldPowerUp.onload = onImageLoad;
        game.assets.rapidFirePowerUp.onload = onImageLoad;
        game.assets.multiShotPowerUp.onload = onImageLoad;

        game.assets.backgroundImage.src = 'img/space-background.png';
        game.assets.playerImage.src = 'img/player-ship.png';
        game.assets.enemyImage.src = 'img/enemy-ship.png';
        game.assets.shieldPowerUp.src = 'img/shield-powerup.png';
        game.assets.rapidFirePowerUp.src = 'img/rapid-fire-powerup.png';
        game.assets.multiShotPowerUp.src = 'img/multi-shot-powerup.png';
    });
}

async function fetchScores() {
    game.isLoadingScores = true;
    const loader = document.getElementById('scores-loader');
    if (loader) loader.classList.remove('hidden');
    
    try {
        const scores = await getHighScores();
        game.highScores = scores;
        updateScoreboardDisplay();
    } catch (error) {
        console.error('Error fetching scores:', error);
    } finally {
        game.isLoadingScores = false;
        if (loader) loader.classList.add('hidden');
    }
}


function updateScoreboardDisplay() {
    const scoreboardList = document.getElementById('high-scores-list');
    if (!scoreboardList) return;
    
    scoreboardList.innerHTML = '';
    game.highScores.forEach((score, index) => {
        const li = document.createElement('li');
        // Change score.name to score.player_name to match the database field
        li.textContent = `${index + 1}. ${score.player_name}: ${score.score}`;
        scoreboardList.appendChild(li);
    });
}

async function initGame() {
    // Initialize canvas
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = CANVAS_WIDTH;
    game.canvas.height = CANVAS_HEIGHT;
    
    // Initialize game state
    game.isGameActive = false;
    game.score = INITIAL_SCORE;
    game.lives = INITIAL_LIVES;
    game.level = INITIAL_LEVEL;
    game.enemies = [];
    game.bullets = [];
    game.keys = {};
    game.lastShotTime = 0;
    
    // Load assets
    await loadImages();
    
    // Preload sounds
    const soundManager = new SoundManager();
    await soundManager.init();
    
    // Create player
    game.player = new Player(
        game.canvas.width / 2 - PLAYER_WIDTH / 2,
        game.canvas.height - PLAYER_HEIGHT - 20
    );
    
    // Set up event listeners
    if (game.keydownListener) {
        document.removeEventListener('keydown', game.keydownListener);
    }
    if (game.keyupListener) {
        document.removeEventListener('keyup', game.keyupListener);
    }
    
    game.keydownListener = (e) => {
        if (!game.isGameActive) return;
        game.keys[e.code] = true;
        
        const now = Date.now();
        const adjustedCooldown = SHOOTING_COOLDOWN * game.player.cooldownReduction;
        
        if (e.code === 'Space' && now - game.lastShotTime > adjustedCooldown) {
            if (game.player.hasMultiShot) {
                // Create three angled bullets
                [-15, 0, 15].forEach(angle => {
                    const bullet = new Bullet(
                        game.player.x + game.player.width / 2 - BULLET_WIDTH / 2,
                        game.player.y
                    );
                    bullet.angle = angle;
                    game.bullets.push(bullet);
                });
            } else {
                // Single bullet
                game.bullets.push(new Bullet(
                    game.player.x + game.player.width / 2 - BULLET_WIDTH / 2,
                    game.player.y
                ));
            }
            game.lastShotTime = now;
            soundManager.play('shoot');
        }
    };
    
    game.keyupListener = (e) => {
        game.keys[e.code] = false;
    };
    
    document.addEventListener('keydown', game.keydownListener);
    document.addEventListener('keyup', game.keyupListener);
}

function startGame() {
    if (!game.canvas || !game.ctx) {
        console.error('Canvas not initialized');
        return;
    }
    
    game.isGameActive = true;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Reset game state
    game.score = INITIAL_SCORE;
    game.lives = INITIAL_LIVES;
    game.level = INITIAL_LEVEL;
    game.enemies = [];
    game.bullets = [];
    
    // Update UI
    scoreValue.textContent = game.score;
    livesValue.textContent = game.lives;
    levelValue.textContent = game.level;
    
    // Start game loop
    update();
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
                soundManager.play('explosion');
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

    // Update explosions
    explosions.forEach((explosion, index) => {
        explosion.update();
        if (explosion.isFinished()) {
            explosions.splice(index, 1);
        }
    });

    updateEnemySpawning(); // Call the enemy spawning logic

    // Power-up spawning
    const now = Date.now();
    if (now - game.lastPowerUpSpawn > POWERUP_SPAWN_INTERVAL && Math.random() < POWERUP_SPAWN_CHANCE) {
        const types = ['shield', 'multishot', 'rapidfire']; // Updated to match POWERUP_TYPES keys
        const randomType = types[Math.floor(Math.random() * types.length)];
        game.powerUps.push(new PowerUp(
            Math.random() * (game.canvas.width - POWERUP_WIDTH),
            -POWERUP_HEIGHT,
            randomType
        ));
        game.lastPowerUpSpawn = now;
    }

    // Update existing power-ups
    game.powerUps = game.powerUps.filter(powerUp => {
        powerUp.move();
        
        // Debug collision detection
        console.log(
            `Player: (${Math.round(game.player.x)}, ${Math.round(game.player.y)})`,
            `PowerUp: (${Math.round(powerUp.x)}, ${Math.round(powerUp.y)})`,
            `Distance: ${Math.round(Math.sqrt(
                Math.pow(game.player.x - powerUp.x, 2) + 
                Math.pow(game.player.y - powerUp.y, 2)
            ))}`
        );
        
        if (checkCollision(game.player, powerUp)) {
            activatePowerUp(powerUp);
            return false; // Remove power-up
        }
        
        // Remove if off screen
        return powerUp.y < game.canvas.height;
    });
}

function renderGame() {
    // Draw the background first
    game.ctx.drawImage(game.assets.backgroundImage, 0, 0, game.canvas.width, game.canvas.height);
    
    // Draw the player
    game.player.draw();
    
    // Draw the bullets
    game.bullets.forEach(bullet => {
        game.ctx.fillStyle = 'yellow';
        game.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw the enemies
    game.enemies.forEach(enemy => enemy.draw());
    
    // Draw the explosions last to ensure they are on top
    explosions.forEach(explosion => explosion.draw(game.ctx));

    // Draw power-ups
    game.powerUps.forEach(powerUp => powerUp.draw());

    // Draw power-up indicator
    drawPowerUpIndicator();

    // Draw hitboxes for debugging
    game.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    game.ctx.strokeRect(
        game.player.x, game.player.y,
        game.player.width, game.player.height
    );
    
    game.powerUps.forEach(powerUp => {
        game.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        game.ctx.strokeRect(
            powerUp.x, powerUp.y,
            powerUp.width, powerUp.height
        );
    });
}

function update() {
    if (!game.isGameActive) return;
    
    updateGameLogic();
    renderGame();
    game.gameLoop = requestAnimationFrame(update);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj2.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj2.height > obj2.y;
}

function resetEnemyPosition(enemy) {
    enemy.resetPosition();
}

async function checkHighScore(score) {
    const scores = await getHighScores(10);
    return scores.length < 10 || score > scores[scores.length - 1].score;
}

// Add new function to check if score is lower than lowest
async function isLowScore(score) {
    try {
        const scores = await getHighScores(10);
        if (scores.length < 10) return false; // Not full yet, all scores accepted
        return score < scores[scores.length - 1].score;
    } catch (error) {
        console.error('Error checking low score:', error);
        return false; // Default to false on error
    }
}

// Update gameOver function
async function gameOver() {
    game.isGameActive = false;
    cancelAnimationFrame(game.gameLoop);
    soundManager.play('gameOver');
    
    gameOverScreen.style.display = 'flex';
    finalScoreValue.textContent = game.score;
    
    const highScoreInput = document.getElementById('high-score-input');
    const highScores = document.getElementById('high-scores');
    const playerNameInput = document.getElementById('player-name');
    
    // Check if score is too low
    if (await isLowScore(game.score)) {
        highScoreInput.classList.add('hidden');
        const lowScoreMessage = document.createElement('p');
        lowScoreMessage.textContent = "Keep trying! Your score wasn't high enough for the leaderboard.";
        lowScoreMessage.style.color = '#FF4136';
        gameOverScreen.insertBefore(lowScoreMessage, highScores);
    } else {
        // Existing high score logic
        const isHighScore = await checkHighScore(game.score);
        if (isHighScore) {
            highScoreInput.classList.remove('hidden');
            playerNameInput.focus();
            playerNameInput.value = '';
            
            const saveScore = async (e) => {
                if (e.key === 'Enter' && playerNameInput.value.trim()) {
                    await saveHighScore(playerNameInput.value.trim(), game.score);
                    await fetchScores();
                    highScoreInput.classList.add('hidden');
                    playerNameInput.removeEventListener('keypress', saveScore);
                }
            };
            
            playerNameInput.addEventListener('keypress', saveScore);
        }
    }
    
    highScores.classList.remove('hidden');
    await fetchScores();
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
    if (now - lastEnemySpawnTime > game.enemySpawnInterval) {
        spawnEnemy();
        lastEnemySpawnTime = now;
    }
}

function updateDifficulty() {
    const now = Date.now();
    if (now - lastDifficultyIncrease > DIFFICULTY_INCREASE_INTERVAL) {
        game.enemySpeedMin += ENEMY_SPEED_INCREASE;
        game.enemySpeedMax += ENEMY_SPEED_INCREASE;
        if (game.enemySpawnInterval > 1000) {
            game.enemySpawnInterval -= 100;
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

async function updateHighScores() {
    try {
        await saveHighScore(game.playerName, game.score);
        // Refresh the scoreboard
        await fetchScores();
    } catch (error) {
        console.error('Error updating high scores:', error);
    }
}

function activatePowerUp(powerUp) {
    // Clear any existing power-up timer
    if (game.powerUpTimer) {
        clearTimeout(game.powerUpTimer);
    }

    // Apply power-up effect
    switch (powerUp.type) {
        case 'shield':
            game.player.hasShield = true;
            break;
        case 'rapidFire':
            game.player.hasRapidFire = true;
            break;
        case 'multiShot':
            game.player.hasMultiShot = true;
            break;
    }

    // Play power-up sound
    soundManager.play('powerUp');

    // Set timer to remove power-up
    game.powerUpTimer = setTimeout(() => {
        game.player.hasShield = false;
        game.player.hasrapidFire = false;
        game.player.hasMultiShot = false;
        game.powerUpActive = null;
    }, game.powerUpDuration);
}

function drawPowerUpIndicator() {
    if (game.powerUpActive) {
        const config = POWERUP_TYPES[game.powerUpActive];
        const timeLeft = config.duration - (Date.now() - game.powerUpStartTime);
        const width = 100 * (timeLeft / config.duration);
        
        game.ctx.fillStyle = config.color;
        game.ctx.fillRect(10, 10, width, 5);
    }
}

function createBullet(x, y) {
    if (game.player.hasMultiShot) {
        return [-15, 0, 15].map(angle => {
            const bullet = new Bullet(x, y);
            bullet.angle = angle;
            return bullet;
        });
    }
    return [new Bullet(x, y)];
}

window.addEventListener('load', async () => {
    await initGame();
    
    // Move these event listeners here to ensure elements exist
    const startButton = document.getElementById('start-button');
    const playAgainButton = document.getElementById('play-again-button');
    
    startButton.addEventListener('click', () => {
        startGame();
    });
    
    playAgainButton.addEventListener('click', () => {
        restartGame();
    });
});