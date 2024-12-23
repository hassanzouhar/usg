export class UIManager {
    constructor() {
        this.scoreElement = document.getElementById('scoreValue');
        this.livesElement = document.getElementById('livesValue');
        this.levelElement = document.getElementById('levelValue');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
    }

    updateScore(score) {
        this.scoreElement.textContent = score;
    }

    updateLives(lives) {
        this.livesElement.textContent = lives;
    }

    updateLevel(level) {
        this.levelElement.textContent = level;
    }

    showStartScreen() {
        this.startScreen.style.display = 'flex';
        this.gameOverScreen.style.display = 'none';
    }

    showGameOverScreen(score) {
        this.gameOverScreen.style.display = 'flex';
        document.getElementById('finalScoreValue').textContent = score;
    }
}