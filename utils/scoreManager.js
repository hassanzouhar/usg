import { saveHighScore, getHighScores } from '../supabase.js';
import { Logger } from '../core/logger.js';

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.combo = 0;
        this.comboTimer = null;
        this.scoreMultiplier = 1;
        this.highScores = [];
        this.isLoadingScores = false;
    }

    updateScore(points) {
        this.combo++;
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => this.combo = 0, 2000);
        
        const finalScore = points * this.scoreMultiplier * (1 + this.combo * 0.1);
        this.score += Math.floor(finalScore);
        return this.score;
    }

    async checkHighScore(score) {
        const scores = await getHighScores(10);
        return scores.length < 10 || score > scores[scores.length - 1].score;
    }

    async isLowScore(score) {
        try {
            const scores = await getHighScores(10);
            if (scores.length < 10) return false;
            return score < scores[scores.length - 1].score;
        } catch (error) {
            Logger.asset('error', 'Error checking low score');
            return false;
        }
    }

    async saveScore(playerName) {
        try {
            await saveHighScore(playerName, this.score);
            await this.fetchScores();
        } catch (error) {
            Logger.asset('error', 'Error saving high score');
        }
    }

    async fetchScores() {
        this.isLoadingScores = true;
        try {
            this.highScores = await getHighScores();
            return this.highScores;
        } catch (error) {
            Logger.asset('error', 'Error fetching scores');
            return [];
        } finally {
            this.isLoadingScores = false;
        }
    }

    reset() {
        this.score = 0;
        this.combo = 0;
        clearTimeout(this.comboTimer);
        this.scoreMultiplier = 1;
    }
}