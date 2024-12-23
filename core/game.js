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
        this.gameLoop();
    }

    gameLoop() {
        if (!this.state.isActive) return;
        
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}