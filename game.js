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
    keyupListener: null
};

// Asset loading and game initialization will be handled by loadGame() function

// Create SoundPool class
class SoundPool {
    constructor(soundSrc, poolSize) {
        this.pool = [];
        this.currentSound = 0;
        
        for (let i = 0; i < poolSize; i++) {
            const sound = new Audio(soundSrc);
            sound.volume = 0.5; // Adjust volume as needed
            sound.preload = 'auto'; // Preload the sound
            this.pool.push(sound);
        }
    }

    play() {
        // Reset if sound is still playing
        if (this.pool[this.currentSound].currentTime > 0) {
            this.pool[this.currentSound].currentTime = 0;
        }
        
        this.pool[this.currentSound].play();
        this.currentSound = (this.currentSound + 1) % this.pool.length;
    }
}

// Replace sounds object with SoundManager
class SoundManager {
    constructor() {
        this.sounds = {
            shoot: new SoundPool('sounds/shoot.wav', SOUND_POOL_SIZE),
            explosion: new SoundPool('sounds/explosion.wav', SOUND_POOL_SIZE),
            powerUp: new SoundPool('sounds/powerup.wav', SOUND_POOL_SIZE),
            gameOver: new Audio('sounds/gameover.wav') // Single instance for game over
        };
        
        this.sounds.gameOver.preload = 'auto'; // Preload the game over sound
        this.muted = false;
    }

    play(soundName) {
        if (this.muted) return;
        if (this.sounds[soundName] instanceof SoundPool) {
            this.sounds[soundName].play();
        } else {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play();
        }
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
        game.assets.backgroundImage = new Image();
        game.assets.playerImage = new Image();
        game.assets.enemyImage = new Image();

        let loadedImages = 0;
        const totalImages = 3;

        function onImageLoad() {
            loadedImages++;
            if (loadedImages === totalImages) {
                resolve();
            }
        }

        game.assets.backgroundImage.onload = onImageLoad;
        game.assets.playerImage.onload = onImageLoad;
        game.assets.enemyImage.onload = onImageLoad;

        game.assets.backgroundImage.src = 'img/space-background.png';
        game.assets.playerImage.src = 'img/player-ship.png';
        game.assets.enemyImage.src = 'img/enemy-ship.png';
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
    soundManager.play('shoot');
    soundManager.play('explosion');
    soundManager.play('powerUp');
    soundManager.play('gameOver');
    
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
        game.keys[e.code] = true;
        if (e.code === 'Space' && game.isGameActive && 
            Date.now() - game.lastShotTime > SHOOTING_COOLDOWN) {
            game.bullets.push(new Bullet(
                game.player.x + game.player.width / 2 - BULLET_WIDTH / 2,
                game.player.y
            ));
            game.lastShotTime = Date.now();
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
}

function update() {
    if (!game.isGameActive) return;
    
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