import { GAME_CONSTANTS } from '../core/constants.js';
import { GameObject } from '../core/gameObject.js';
import { Logger } from '../core/logger.js';

export class Enemy extends GameObject {
    constructor(x, y) {
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.ENEMY.WIDTH, 
            GAME_CONSTANTS.DIMENSIONS.ENEMY.HEIGHT,
            null // Image will be set by AssetManager
        );
        this.resetPosition();
    }

    resetPosition() {
        // Reset to top of screen at random x position
        this.y = -this.height;
        this.x = Math.random() * (GAME_CONSTANTS.DIMENSIONS.CANVAS.WIDTH - this.width);
        
        // Randomize speed within bounds using clean calculation
        this.speed = GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MIN + 
            Math.random() * (GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MAX - GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MIN);
        
        Logger.asset('reset', 'enemy');
    }

    move(deltaTime) {
        // Move downward with deltaTime for smooth motion
        this.y += this.speed * (deltaTime / 16); // normalize to ~60fps
        
        // Check if enemy has moved off screen
        if (this.y > GAME_CONSTANTS.DIMENSIONS.CANVAS.HEIGHT) {
            this.resetPosition();
            return true; // Enemy went off screen
        }
        return false;
    }

    setImage(image) {
        this.image = image;
    }
}