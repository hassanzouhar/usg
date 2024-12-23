export class GameObject {
    constructor(x, y, width, height, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
    }

    draw(ctx) {
        if (this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
}

export class GameLoop {
    update() {
        this.updateGameLogic();
        this.render();
        if (this.state.isActive) {
            requestAnimationFrame(() => this.update());
        }
    }

    updateGameLogic() {
        this.updateEntities();
        this.checkCollisions();
        this.spawnEnemies();
        this.updateDifficulty();
    }

    render() {
        this.renderBackground();
        this.renderEntities();
        this.renderUI();
    }
}

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.assetManager = new AssetManager();
        this.soundManager = new SoundManager();
        this.collisionManager = new CollisionManager();
        this.debug = window.DEBUG || {
            COLLISIONS: false,
            POWERUPS: false,
            EXPLOSIONS: false,
            SOUND: true,
            ASSETS: true
        };
        this.state = {
            isActive: false,
            lastFrameTime: 0,
            deltaTime: 0
        };
    }

    async init() {
        await this.assetManager.loadAssets();
        await this.soundManager.init();
        this.setupEventListeners();
        this.state.entities.player = new Player(
            GAME_CONSTANTS.DIMENSIONS.CANVAS.WIDTH / 2,
            GAME_CONSTANTS.DIMENSIONS.CANVAS.HEIGHT - 100
        );

        // Check if in development mode using hostname
        if (window.location.hostname === 'localhost') {
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                debugPanel.classList.remove('hidden');
            }
        }
    }

    start() {
        this.state.isActive = true;
        this.state.lastFrameTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        if (!this.state.isActive) return;
        
        // Calculate delta time for smooth animations
        this.state.deltaTime = timestamp - this.state.lastFrameTime;
        this.state.lastFrameTime = timestamp;

        // Update game state
        this.update(this.state.deltaTime);
        
        // Render frame
        this.render();

        // Queue next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    stop() {
        this.state.isActive = false;
    }

    update(deltaTime) {
        // Override in child class
    }

    render() {
        // Override in child class
    }
}

class GameInstance extends Game {
    update(deltaTime) {
        // Update player
        if (this.player) {
            this.player.move(deltaTime);
        }

        // Update bullets with deltaTime
        this.bullets = this.bullets.filter(bullet => {
            bullet.move(deltaTime);
            return bullet.y > 0;
        });

        // Update enemies with deltaTime
        this.enemies.forEach(enemy => enemy.move(deltaTime));

        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(deltaTime);
            return !explosion.isFinished();
        });

        // Update powerups with deltaTime
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.move(deltaTime);
            return powerUp.y < this.canvas.height;
        });

        this.checkCollisions();
        this.spawnEnemies();
        this.updateDifficulty();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.drawImage(this.assets.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game objects
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.player?.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        this.explosions.forEach(explosion => explosion.draw(this.ctx));
        
        // Draw UI
        this.drawPowerUpIndicator();
    }
}