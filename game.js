import { supabase, saveHighScore, getHighScores } from './supabase.js';

// Add at top of file with other constants
const DEBUG = {
    COLLISIONS: false,
    POWERUPS: false,
    EXPLOSIONS: false,
    SOUND: true,
    ASSETS: true
};

// Create logging utility
const Logger = {
    collision(obj1, obj2, overlap) {
        if (!DEBUG.COLLISIONS) return;
        
        console.log('%cCollision', 'color: yellow', {
            object1: {
                type: obj1.constructor.name,
                x: Math.round(obj1.x),
                y: Math.round(obj1.y),
                width: obj1.width,
                height: obj1.height
            },
            object2: {
                type: obj2.constructor.name,
                x: Math.round(obj2.x),
                y: Math.round(obj2.y),
                width: obj2.width,
                height: obj2.height
            },
            overlap
        });
    },

    powerup(action, type, position) {
        if (!DEBUG.POWERUPS) return;
        
        console.log('%cPowerUp', 'color: cyan', {
            action,
            type,
            position: {
                x: Math.round(position.x),
                y: Math.round(position.y)
            }
        });
    },

    explosion(phase, data) {
        if (!DEBUG.EXPLOSIONS) return;
        
        console.log('%cExplosion', 'color: orange', {
            phase,
            ...data
        });
    },

    sound(action, soundName) {
        if (!DEBUG.SOUND) return;
        
        console.log('%cSound', 'color: green', {
            action,
            sound: soundName
        });
    },

    asset(status, name) {
        if (!DEBUG.ASSETS) return;
        
        console.log('%cAsset', 'color: blue', {
            status,
            name
        });
    }
};

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
const CANVAS_HEIGHT = 1000;
const INITIAL_LIVES = 10;
const INITIAL_SCORE = 0;
const INITIAL_LEVEL = 1;
const DIFFICULTY_INCREASE_INTERVAL = 300000;
const MAX_ENEMIES = 3;
const ENEMY_SPEED_INCREASE = 0.1;
const SOUND_POOL_SIZE = 5;
const AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
const POWERUP_SPAWN_INTERVAL = 15000; // First power-up after 15 seconds, then regularly
const POWERUP_SPAWN_CHANCE = 0.2; // 20% chance to spawn when interval is met
const POWERUP_WIDTH = 50;
const POWERUP_HEIGHT = 50;
const INITIAL_ENEMY_COUNT = 3;
const ENEMY_SPAWN_INTERVAL = 2000; // 2 seconds

const POWERUP_TYPES = {
    'shield': {
        type: 'shield',
        imageKey: 'shieldPowerUp',
        duration: 5000,
        color: 'blue',
        effect: (player) => {
            player.hasShield = true;
            Logger.powerup('activate', 'shield');
        },
        remove: (player) => {
            player.hasShield = false;
            Logger.powerup('deactivate', 'shield');
        }
    },
    'multishot': {
        type: 'multishot',
        imageKey: 'multiShotPowerUp',
        duration: 5000,
        color: 'green',
        effect: (player) => {
            player.hasMultiShot = true;
            Logger.powerup('activate', 'multishot');
        },
        remove: (player) => {
            player.hasMultiShot = false;
            Logger.powerup('deactivate', 'multishot');
        }
    },
    'rapidfire': {
        type: 'rapidfire',
        imageKey: 'rapidFirePowerUp',
        duration: 5000,
        color: 'red',
        effect: (player) => {
            player.cooldownReduction = 0.5;
            Logger.powerup('activate', 'rapidfire');
        },
        remove: (player) => {
            player.cooldownReduction = 1;
            Logger.powerup('deactivate', 'rapidfire');
        }
    }
};

// Global variables
let lastDifficultyIncrease = 0;
let lastEnemySpawnTime = 0;

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
        enemyImage: null,
        explosionImage: null,
        explosionSheet: null
    },
    isGameActive: false,
    keydownListener: null,
    keyupListener: null,
    lastPowerUpSpawn: 0,
    explosions: []
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

    draw() {
        game.ctx.save();
        game.ctx.fillStyle = 'yellow';
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.restore();
        
        if (DEBUG.COLLISIONS) {
            game.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            game.ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
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
        console.log('Creating explosion at:', x, y);
    }

    update() {
        this.radius += this.expansionRate;
        this.opacity -= this.fadeRate;
        console.log('Explosion update:', {
            radius: this.radius,
            opacity: this.opacity.toFixed(2)
        });
    }

    draw(ctx) {
        if (this.opacity <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'orange';
        ctx.fill();
        ctx.restore();
    }

    isFinished() {
        return this.opacity <= 0;
    }
}

class PowerUp extends GameObject {
    constructor(x, y, type) {
        const normalizedType = type.toLowerCase();
        if (!POWERUP_TYPES[normalizedType]) {
            Logger.powerup('error', `Invalid type: ${type}`);
            type = 'shield'; // Default to shield
        }
        const powerUpConfig = POWERUP_TYPES[normalizedType];
        const image = game.assets[powerUpConfig.imageKey];
        
        if (!image) {
            Logger.powerup('error', `Missing image for type: ${type}`);
        }
        
        super(x, y, POWERUP_WIDTH, POWERUP_HEIGHT, image);
        this.type = normalizedType;
        this.config = powerUpConfig;
        this.speed = 2;
        
        Logger.powerup('create', this.type, {x, y});
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
        
        // Clear existing power-up if active
        if (game.powerUpTimer) {
            clearTimeout(game.powerUpTimer);
            if (game.powerUpActive && POWERUP_TYPES[game.powerUpActive].remove) {
                POWERUP_TYPES[game.powerUpActive].remove(player);
            }
        }

        // Apply new power-up
        this.config.effect(player);
        game.powerUpActive = this.type;
        
        // Set expiration timer
        game.powerUpTimer = setTimeout(() => {
            if (this.config.remove) {
                this.config.remove(player);
            }
            game.powerUpActive = null;
        }, this.config.duration);

        soundManager.play('powerUp');
    }
}

class SpriteSheet {
    constructor(image, frameWidth, frameHeight) {
        if (!image || !image.complete) {
            throw new Error('Invalid or incomplete image provided to SpriteSheet');
        }

        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frames = [];
        
        // Validate dimensions
        if (image.width % frameWidth !== 0 || image.height % frameHeight !== 0) {
            console.warn('Image dimensions not evenly divisible by frame size');
        }
        
        // Calculate frames
        const cols = Math.floor(image.width / frameWidth);
        const rows = Math.floor(image.height / frameHeight);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.frames.push({
                    x: col * frameWidth,
                    y: row * frameHeight,
                    width: frameWidth,
                    height: frameHeight
                });
            }
        }
        
        console.log(`SpriteSheet initialized with ${this.frames.length} frames`);
    }

    drawFrame(ctx, frameNumber, x, y, width, height) {
        if (frameNumber < 0 || frameNumber >= this.frames.length) {
            console.warn(`Invalid frame number: ${frameNumber}`);
            return;
        }

        const frame = this.frames[frameNumber];
        try {
            ctx.drawImage(
                this.image,
                frame.x, frame.y,
                frame.width, frame.height,
                x, y,
                width || frame.width,
                height || frame.height
            );
        } catch (error) {
            console.error('Error drawing sprite frame:', error);
        }
    }

    getFrameCount() {
        return this.frames.length;
    }
}

function loadImages() {
    return new Promise((resolve) => {
        const totalImages = 7; // Include explosion spritesheet
        let loadedImages = 0;
        const imageStatus = {};

        function onImageLoad(imageName) {
            loadedImages++;
            imageStatus[imageName] = 'loaded';
            console.log(`Loaded image: ${imageName}`);
            
            if (loadedImages === totalImages) {
                if (game.assets.explosionImage?.complete) {
                    game.assets.explosionSheet = new SpriteSheet(
                        game.assets.explosionImage,
                        64, // frame width
                        64  // frame height
                    );
                }
                console.log('All images loaded:', imageStatus);
                resolve();
            }
        }

        // Add explosion spritesheet loading
        game.assets.explosionImage = new Image();
        game.assets.explosionImage.onload = () => onImageLoad('explosionSheet');
        game.assets.explosionImage.onerror = () => onImageError('explosionSheet');
        game.assets.explosionImage.src = 'img/explosion-sheet.png';

        game.assets.backgroundImage = new Image();
        game.assets.playerImage = new Image();
        game.assets.enemyImage = new Image();
        game.assets.shieldPowerUp = new Image();
        game.assets.rapidFirePowerUp = new Image();
        game.assets.multiShotPowerUp = new Image();

        function onImageLoad(imageName) {
            loadedImages++;
            imageStatus[imageName] = 'loaded';
            console.log(`Loaded image: ${imageName}`);
            
            if (loadedImages === totalImages) {
                console.log('All images loaded:', imageStatus);
                resolve();
            }
        }

        function onImageError(imageName) {
            loadedImages++;
            imageStatus[imageName] = 'failed';
            console.error(`Failed to load image: ${imageName}`);
            
            if (loadedImages === totalImages) {
                console.log('Image loading complete with errors:', imageStatus);
                resolve();
            }
        }

        // Add load/error handlers for each image
        game.assets.backgroundImage.onload = () => onImageLoad('background');
        game.assets.backgroundImage.onerror = () => onImageError('background');
        
        game.assets.playerImage.onload = () => onImageLoad('player');
        game.assets.playerImage.onerror = () => onImageError('player');
        
        game.assets.enemyImage.onload = () => onImageLoad('enemy');
        game.assets.enemyImage.onerror = () => onImageError('enemy');
        
        game.assets.shieldPowerUp.onload = () => onImageLoad('shieldPowerUp');
        game.assets.shieldPowerUp.onerror = () => onImageError('shieldPowerUp');
        
        game.assets.rapidFirePowerUp.onload = () => onImageLoad('rapidFirePowerUp');
        game.assets.rapidFirePowerUp.onerror = () => onImageError('rapidFirePowerUp');
        
        game.assets.multiShotPowerUp.onload = () => onImageLoad('multiShotPowerUp');
        game.assets.multiShotPowerUp.onerror = () => onImageError('multiShotPowerUp');

        // Set image sources
        console.log('Starting image load...');
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

    // Initialize enemies
    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
        spawnEnemy();
    }
    lastEnemySpawnTime = Date.now();
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
                console.log('Collision Details:', {
                    bullet: {
                        x: Math.round(bullet.x),
                        y: Math.round(bullet.y),
                        width: BULLET_WIDTH,
                        height: BULLET_HEIGHT
                    },
                    enemy: {
                        x: Math.round(enemy.x),
                        y: Math.round(enemy.y),
                        width: ENEMY_WIDTH,
                        height: ENEMY_HEIGHT
                    }
                });
                resetEnemyPosition(enemy);
                updateScore(100); // Increment score when an enemy is destroyed
                game.bullets.splice(index, 1);
                console.log('Creating explosion effect');
                game.explosions.push(new Explosion(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2
                ));
                soundManager.play('explosion');
                console.log('Playing explosion sound');
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

    // Update and clean up explosions in one pass
    game.explosions = game.explosions.filter(explosion => {
        explosion.update();
        return !explosion.isFinished();
    });

    // Power-up spawning
    const now = Date.now();
    if (now - game.lastPowerUpSpawn > POWERUP_SPAWN_INTERVAL && Math.random() < POWERUP_SPAWN_CHANCE) {
        const types = ['shield', 'rapidfire']; // Use exact strings that match POWERUP_TYPES keys
        const randomType = types[Math.floor(Math.random() * types.length)];
        console.log(`Spawning ${randomType} power-up`);
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
        
        // Enhanced debug logging
        const distance = Math.sqrt(
            Math.pow(game.player.x - powerUp.x, 2) + 
            Math.pow(game.player.y - powerUp.y, 2)
        );
        
        console.log(
            `Player: (${Math.round(game.player.x)}, ${Math.round(game.player.y)})`,
            `Dims: ${PLAYER_WIDTH}x${PLAYER_HEIGHT}`,
            `PowerUp: (${Math.round(powerUp.x)}, ${Math.round(powerUp.y)})`,
            `Dims: ${POWERUP_WIDTH}x${POWERUP_HEIGHT}`,
            `Distance: ${Math.round(distance)}`,
            `Collision: ${checkCollision(game.player, powerUp)}`
        );
        
        // Check collision with visual debug
        if (checkCollision(game.player, powerUp)) {
            console.log('COLLISION DETECTED!');
            activatePowerUp(powerUp);
            return false;
        }
        
        return powerUp.y < game.canvas.height;
    });

    // Update enemy spawning
    updateEnemySpawning();
    
    // Update existing enemies
    game.enemies.forEach(enemy => enemy.move());
}

// Add collision visualization and logging
function checkCollision(obj1, obj2) {
    // Calculate boundaries
    const obj1Right = obj1.x + obj1.width;
    const obj1Bottom = obj1.y + obj1.height;
    const obj2Right = obj2.x + obj2.width;
    const obj2Bottom = obj2.y + obj2.height;

    // Check for collision
    const collision = (
        obj1.x < obj2Right &&
        obj1Right > obj2.x &&
        obj1.y < obj2Bottom &&
        obj1Bottom > obj2.y
    );

    if (collision) {
        const overlap = {
            x: Math.min(obj1Right, obj2Right) - Math.max(obj1.x, obj2.x),
            y: Math.min(obj1Bottom, obj2Bottom) - Math.max(obj1.y, obj2.y)
        };
        
        Logger.collision(obj1, obj2, overlap);
    }

    return collision;
}

function renderGame() {
    // Draw background
    game.ctx.drawImage(game.assets.backgroundImage, 0, 0, game.canvas.width, game.canvas.height);
    
    // Draw bullets
    game.bullets.forEach(bullet => bullet.draw());
    
    // Draw other game objects
    game.player.draw();
    game.enemies.forEach(enemy => enemy.draw());
    game.powerUps.forEach(powerUp => powerUp.draw());
    
    // Draw explosions last to ensure they're visible
    game.explosions.forEach(explosion => {
        explosion.draw(game.ctx);
        console.log('Drawing explosion:', {
            x: explosion.x,
            y: explosion.y,
            radius: explosion.radius,
            opacity: explosion.opacity
        });
    });
    
    // Draw UI elements last
    drawPowerUpIndicator();
}

function update() {
    if (!game.isGameActive) return;
    
    updateGameLogic();
    renderGame();
    game.gameLoop = requestAnimationFrame(update);
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
    console.log(`Attempting to activate ${powerUp.type} power-up`);
    
    if (!powerUp.config || !powerUp.config.effect) {
        console.error('Invalid power-up configuration');
        return;
    }
    
    // Apply power-up effect
    powerUp.config.effect(game.player);
    game.powerUpActive = powerUp.type;
    game.powerUpStartTime = Date.now();
    
    console.log(`Power-up ${powerUp.type} activated`, {
        hasMultiShot: game.player.hasMultiShot,
        hasRapidFire: game.player.hasRapidFire,
        cooldownReduction: game.player.cooldownReduction
    });
    
    // Clear existing timer
    if (game.powerUpTimer) {
        clearTimeout(game.powerUpTimer);
    }
    
    // Set expiration timer
    game.powerUpTimer = setTimeout(() => {
        console.log(`${powerUp.type} power-up expired`);
        if (powerUp.config.remove) {
            powerUp.config.remove(game.player);
        }
        game.powerUpActive = null;
    }, powerUp.config.duration || 5000);
    
    soundManager.play('powerUp');
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

function renderHitboxes() {
    game.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    
    // Enemy hitboxes
    game.enemies.forEach(enemy => {
        game.ctx.strokeRect(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
    });
    
    // Bullet hitboxes
    game.bullets.forEach(bullet => {
        game.ctx.strokeRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
    });
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