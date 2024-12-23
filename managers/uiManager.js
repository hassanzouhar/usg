export class UIManager {
    constructor() {
        this.initializeElements();
        this.validateElements();
        this.setupInputHandlers();
        
        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false
        };
    }

    initializeElements() {
        // Screen elements
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-container'),
            gameOver: document.getElementById('game-over-screen'),
            loading: document.getElementById('loading-screen')
        };

        // UI elements
        this.elements = {
            score: document.getElementById('scoreValue'),
            lives: document.getElementById('livesValue'),
            level: document.getElementById('levelValue'),
            finalScore: document.getElementById('finalScoreValue'),
            mute: document.getElementById('muteButton')
        };
    }

    validateElements() {
        // Check screen elements
        const missingScreens = Object.entries(this.screens)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        // Check UI elements
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingScreens.length > 0 || missingElements.length > 0) {
            throw new Error(
                'Missing UI elements: ' + 
                [...missingScreens, ...missingElements].join(', ')
            );
        }
    }

    setupInputHandlers() {
        document.addEventListener('keydown', (e) => {
            if (!this.game?.state.isActive) return;
            
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
            console.log('Input state:', this.input);
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
    }

    getInput() {
        return this.input;
    }

    setGame(game) {
        this.game = game;
    }

    updateScore(score) {
        if (this.elements.score) {
            this.elements.score.textContent = score;
        }
    }

    updateLives(lives) {
        if (this.elements.lives) {
            this.elements.lives.textContent = lives;
        }
    }

    updateLevel(level) {
        if (this.elements.level) {
            this.elements.level.textContent = level;
        }
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.style.display = 'none';
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].style.display = 'flex';
        }
    }

    showStartScreen() {
        if (this.screens.start) {
            this.screens.start.style.display = 'flex';
        }
    }

    hideStartScreen() {
        if (this.screens.start) {
            this.screens.start.style.display = 'none';
        } else {
            console.warn('Start screen element not found');
        }
    }

    showGameOverScreen(score) {
        this.screens.gameOver.style.display = 'flex';
        document.getElementById('finalScoreValue').textContent = score;
    }

    drawScore(ctx) {
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        const score = this.elements.score.textContent;
        const padding = 20;
        const textMetrics = ctx.measureText(score);
        ctx.fillText(score, ctx.canvas.width - textMetrics.width - padding, padding + 24);
        ctx.restore();
    }
    
    drawHealth(ctx, health) {
        ctx.save();
        const padding = 20;
        const barWidth = 200;
        const barHeight = 20;
        const x = padding;
        const y = padding;
        
        // Draw background bar
        ctx.fillStyle = '#4a0f0f';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Draw health bar
        const healthPercent = Math.max(0, Math.min(100, health)) / 100;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Draw health text
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(`${health}/100`, x + barWidth / 2, y + barHeight - 4);
        
        ctx.restore();
    }
}
