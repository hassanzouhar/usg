import { GAME_CONSTANTS } from './constants.js';
import { GameObject } from './gameObject.js';
import { Player } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { Bullet } from '../entities/bullet.js';
import { Explosion } from '../entities/explosion.js';
import { AssetManager } from '../managers/assetManager.js';
import { SoundManager } from '../managers/soundManager.js';
import { GameStateManager } from '../managers/gameStateManager.js';
import { UIManager } from '../managers/uiManager.js';
import { PowerUp } from '../entities/powerup.js';

/**
 * Main game engine class that handles the game loop and core functionality.
 * @class Game
 */
export class Game {
    constructor() {
        this.state = {
            isActive: false,
            lastFrameTime: 0,
            deltaTime: 0,
            assetsLoaded: false,
            loadingError: null
        };
        this.initializeManagers();
        this.initializeGameState();
    }

    initializeManagers() {
        this.assetManager = new AssetManager();
        this.soundManager = new SoundManager();
        this.stateManager = new GameStateManager();
        this.uiManager = new UIManager();
        this.uiManager.setGame(this);
    }

    initializeGameState() {
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.input = { left: false, right: false, up: false, down: false, shoot: false };
        this.lastShotTime = 0;
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = GAME_CONSTANTS.GAMEPLAY.ENEMY_SPAWN_INTERVAL;
        this.score = 0;
    }

    async initialize() {
        try {
            await this.setupCanvas();
            await this.loadAssets();
            this.setupEventListeners();
            this.createPlayer();
            this.state.assetsLoaded = true;
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }

    async setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) throw new Error('Canvas element not found');

        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = GAME_CONSTANTS.DIMENSIONS.CANVAS.WIDTH;
        this.canvas.height = GAME_CONSTANTS.DIMENSIONS.CANVAS.HEIGHT;
    }

    async loadAssets() {
        try {
            await Promise.all([
                this.assetManager.loadAssets(),
                this.soundManager.init()
            ]);
            this.assets = this.assetManager.getAssets();
        } catch (error) {
            throw new Error(`Asset loading failed: ${error.message}`);
        }
    }

    createPlayer() {
        const playerX = (this.canvas.width - GAME_CONSTANTS.DIMENSIONS.PLAYER.WIDTH) / 2;
        const playerY = this.canvas.height - GAME_CONSTANTS.DIMENSIONS.PLAYER.HEIGHT - 20;
        this.player = new Player(playerX, playerY);
        this.player.setImage(this.assets.playerImage);
    }

    start() {
        if (!this.canStartGame()) return;
    
        try {
            this.uiManager.showScreen('game');
            this.initialSpawn();
            this.startGameLoop();
        } catch (error) {
            this.handleError('Failed to start game', error);
        }
    }

    startGameLoop() {
        this.state.isActive = true;
        this.state.lastFrameTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(timestamp) {
        if (!this.state.isActive) return;

        try {
            this.updateTimings(timestamp);
            this.update(this.state.deltaTime);
            this.render();
            requestAnimationFrame(this.gameLoop.bind(this));
        } catch (error) {
            this.handleError('Game loop error', error);
        }
    }

    updateTimings(timestamp) {
        this.state.deltaTime = timestamp - this.state.lastFrameTime;
        this.state.lastFrameTime = timestamp;
    }

    update(deltaTime) {
        const input = this.uiManager.getInput();
    
        // Handle player movement and shooting
        if (this.player) {
            let newX = this.player.x;
            let newY = this.player.y;
            
            if (input.left) newX -= this.player.speed;
            if (input.right) newX += this.player.speed;
            if (input.up) newY -= this.player.speed;
            if (input.down) newY += this.player.speed;
            
            // Boundary checks
            newX = Math.max(0, Math.min(newX, this.canvas.width - this.player.width));
            newY = Math.max(0, Math.min(newY, this.canvas.height - this.player.height));
            
            // Update position
            this.player.x = newX;
            this.player.y = newY;
            
            // Debug logging
            console.log('Player position:', {
                x: Math.round(this.player.x),
                y: Math.round(this.player.y),
                input: input
            });
            
            // Shooting logic
            if (input.shoot) {
                const now = performance.now();
                if (now - this.lastShotTime > GAME_CONSTANTS.GAMEPLAY.SHOOTING_COOLDOWN) {
                    const bullet = new Bullet(
                        this.player.x + (this.player.width / 2) - (GAME_CONSTANTS.DIMENSIONS.BULLET.WIDTH / 2),
                        this.player.y
                    );
                    this.bullets.push(bullet);
                    this.lastShotTime = now;
                    this.soundManager.play('shoot');
                    
                    console.log('Bullet fired:', {
                        x: Math.round(bullet.x),
                        y: Math.round(bullet.y),
                        time: this.lastShotTime
                    });
                }
            }
        }
        
        // Rest of update logic...
        this.updateBullets(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateExplosions(deltaTime);
        this.checkCollisions();
        this.spawnEnemies();
        this.updateDifficulty();
        this.updatePowerUps(deltaTime);
    }

    render() {
        this.clearCanvas();
        this.drawBackground();
        this.drawGameObjects();
        this.drawUI();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground() {
        if (this.assets.backgroundImage) {
            this.ctx.drawImage(
                this.assets.backgroundImage,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );
        }
    }

    drawGameObjects() {
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.player?.draw(this.ctx);
        this.explosions.forEach(explosion => explosion.draw(this.ctx));
    }

    drawUI() {
        this.uiManager?.drawScore(this.ctx, this.score);
        this.uiManager?.drawHealth(this.ctx, this.player?.health ?? 0);
    }

    checkCollisions() {
        // Check bullet-enemy collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.explosions.push(new Explosion(enemy.x, enemy.y));
                    enemy.resetPosition();
                    this.bullets.splice(bulletIndex, 1);
                    this.updateScore(100);
                    this.soundManager.play('explosion');
                }
            });
        });

        // Check player-enemy collisions
        this.enemies.forEach(enemy => {
            if (this.player && this.isColliding(enemy, this.player)) {
                this.player.takeDamage(1);
                this.explosions.push(new Explosion(enemy.x, enemy.y));
                if (this.player.health <= 0) this.gameOver();
                enemy.resetPosition();
            }
        });

        // Check player-powerUp collisions
        this.powerUps = this.powerUps.filter(powerUp => {
            if (this.player && this.isColliding(powerUp, this.player)) {
                powerUp.apply(this.player);
                this.soundManager.play('powerUp');
                return false;
            }
            return true;
        });
    }

    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y;
    }

    spawnEnemies() {
        const now = performance.now();
        if (now - this.lastEnemySpawn > this.enemySpawnInterval) {
            const enemy = new Enemy(
                Math.random() * (this.canvas.width - GAME_CONSTANTS.DIMENSIONS.ENEMY.WIDTH),
                -GAME_CONSTANTS.DIMENSIONS.ENEMY.HEIGHT
            );
            enemy.setImage(this.assets.enemyImage);
            this.enemies.push(enemy);
            this.lastEnemySpawn = now;
        }
    }

    updateDifficulty() {
        const currentTime = performance.now();
        const gameTime = (currentTime - this.state.lastFrameTime) / 1000;
        this.enemySpawnInterval = Math.max(
            500,
            GAME_CONSTANTS.GAMEPLAY.ENEMY_SPAWN_INTERVAL - (gameTime * 10)
        );
    }

    gameOver() {
        this.stop();
        this.uiManager.showGameOverScreen(this.score);
        this.soundManager.play('gameOver');
    }

    handleError(message, error) {
        console.error(message, error);
        this.state.loadingError = error;
        this.stop();
    }

    stop() {
        this.state.isActive = false;
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.state.isActive) return;
            
            switch(e.code) {
                case 'ArrowLeft':
                    this.input.left = true;
                    break;
                case 'ArrowRight':
                    this.input.right = true;
                    break;
                case 'ArrowUp':
                    this.input.up = true;
                    break;
                case 'ArrowDown':
                    this.input.down = true;
                    break;
                case 'Space':
                    this.input.shoot = true;
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    this.input.left = false;
                    break;
                case 'ArrowRight':
                    this.input.right = false;
                    break;
                case 'ArrowUp':
                    this.input.up = false;
                    break;
                case 'ArrowDown':
                    this.input.down = false;
                    break;
                case 'Space':
                    this.input.shoot = false;
                    break;
            }
        });

        // UI controls
        const muteButton = document.getElementById('muteButton');
        if (muteButton) {
            muteButton.addEventListener('click', () => {
                this.soundManager.toggleMute();
                muteButton.textContent = this.soundManager.muted ? '🔇' : '🔊';
            });
        }
    }

    canStartGame() {
        if (!this.state.assetsLoaded) {
            this.handleError('Cannot start game', new Error('Assets not loaded'));
            return false;
        }

        if (!this.canvas || !this.ctx) {
            this.handleError('Cannot start game', new Error('Canvas not initialized'));
            return false;
        }

        if (!this.player) {
            this.handleError('Cannot start game', new Error('Player not initialized'));
            return false;
        }

        return true;
    }

    initialSpawn() {
        try {
            // Spawn initial enemies
            const INITIAL_ENEMY_COUNT = 3;
            for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
                const enemy = new Enemy(
                    Math.random() * (this.canvas.width - GAME_CONSTANTS.DIMENSIONS.ENEMY.WIDTH),
                    -GAME_CONSTANTS.DIMENSIONS.ENEMY.HEIGHT
                );
                enemy.setImage(this.assets.enemyImage);
                this.enemies.push(enemy);
            }

            // Reset game state
            this.score = 0;
            this.lastEnemySpawn = performance.now();
            this.enemySpawnInterval = GAME_CONSTANTS.GAMEPLAY.ENEMY_SPAWN_INTERVAL;

            // Update UI
            this.uiManager.updateScore(this.score);
        } catch (error) {
            this.handleError('Failed to initialize game state', error);
        }
    }

    updateBullets(deltaTime) {
        // Normalize speed with deltaTime (60fps baseline)
        const normalizedSpeed = GAME_CONSTANTS.GAMEPLAY.BULLET_BASE_SPEED * (deltaTime / 16.67);
        
        this.bullets = this.bullets.filter(bullet => {
            // Update bullet position with normalized speed
            bullet.move(normalizedSpeed);
            
            // Remove bullets that are off screen
            return bullet.y > -bullet.height;
        });
    }

    updateEnemies(deltaTime) {
        this.enemies.forEach(enemy => {
            enemy.move(deltaTime);
            if (enemy.y > this.canvas.height) {
                enemy.resetPosition();
                this.stateManager.decrementLives();
                this.uiManager.updateLives(this.stateManager.lives);
                
                if (this.stateManager.lives <= 0) {
                    this.gameOver();
                }
            }
        });
    }

    updateExplosions(deltaTime) {
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(deltaTime);
            return !explosion.isFinished();
        });
    }

    updateScore(points) {
        this.score += points;
        this.uiManager.updateScore(this.score);
    }

    updatePowerUps(deltaTime) {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.move(deltaTime);
            if (this.isColliding(powerUp, this.player)) {
                powerUp.apply(this.player);
                return false;
            }
            return powerUp.y < this.canvas.height;
        });

        if (Math.random() < GAME_CONSTANTS.POWERUP.SPAWN_CHANCE) {
            this.spawnPowerUp();
        }
    }

    spawnPowerUp() {
        const types = Object.values(GAME_CONSTANTS.POWERUP.TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (this.canvas.width - GAME_CONSTANTS.DIMENSIONS.POWERUP.WIDTH);
        
        // Create and add new powerup
        const powerUp = new PowerUp(x, -GAME_CONSTANTS.DIMENSIONS.POWERUP.HEIGHT, type);
        if (this.assets.powerUpImage) {
            powerUp.setImage(this.assets[`${type}PowerUp`]);
        }
        this.powerUps.push(powerUp);
    }
}

// Entry Point
window.addEventListener('load', async () => {
    try {
        const game = new Game();
        await game.initialize();
        document.getElementById('start-button')?.addEventListener('click', () => game.start());
    } catch (error) {
        console.error('Game initialization failed:', error);
    }
});
