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
        this.state = {
            isActive: false,
            lastFrameTime: 0,
            deltaTime: 0,
            assetsLoaded: false,
            loadingError: null
        };
    }

    async initialize() {
        try {
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }
            
            this.ctx = this.canvas.getContext('2d');
            await this.loadAssets();
            this.setupEventListeners();
            this.state.assetsLoaded = true;
            
        } catch (error) {
            this.state.loadingError = error;
            console.error('Game initialization failed:', error);
        }
    }

    async loadAssets() {
        try {
            await Promise.all([
                this.assetManager.loadAssets(),
                this.soundManager.init()
            ]);
        } catch (error) {
            throw new Error(`Asset loading failed: ${error.message}`);
        }
    }

    start() {
        if (!this.state.assetsLoaded) {
            console.error('Cannot start game - assets not loaded');
            return;
        }
        
        this.state.isActive = true;
        this.state.lastFrameTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        if (!this.state.isActive) return;
        
        try {
            this.state.deltaTime = timestamp - this.state.lastFrameTime;
            this.state.lastFrameTime = timestamp;

            this.update(this.state.deltaTime);
            this.render();

            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        } catch (error) {
            console.error('Game loop error:', error);
            this.stop();
        }
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

// Entry point
window.addEventListener('load', async () => {
    const game = new GameInstance();
    try {
        await game.initialize();
        
        const startButton = document.getElementById('start-button');
        startButton?.addEventListener('click', () => game.start());
        
    } catch (error) {
        console.error('Game initialization failed:', error);
    }
});