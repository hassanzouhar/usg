import { GAME_CONSTANTS } from '../core/constants.js';

export class GameStateManager {
    constructor() {
        this.resetGame();
    }

    resetGame() {
        this.score = GAME_CONSTANTS.GAMEPLAY.INITIAL_SCORE;
        this.lives = GAME_CONSTANTS.GAMEPLAY.INITIAL_LIVES;
        this.level = GAME_CONSTANTS.GAMEPLAY.INITIAL_LEVEL;
        this.isActive = false;
        this.lastShotTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPowerUpSpawn = 0;
        this.lastDifficultyIncrease = 0;
    }

    updateLevel() {
        this.level++;
    }

    decrementLives() {
        this.lives--;
        return this.lives;
    }
}