import { GAME_CONSTANTS } from './core/constants.js';
import { GameObject } from './core/game.js';
import { Logger } from './core/logger.js';

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
        this.y = -this.height;
        this.x = Math.random() * (GAME_CONSTANTS.DIMENSIONS.CANVAS.WIDTH - this.width);
        this.speed = GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MIN + 
                     Math.random() * (GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MAX - 
                                    GAME_CONSTANTS.GAMEPLAY.ENEMY_SPEED_MIN);
        Logger.asset('reset', 'enemy');
    }

    move() {
        this.y += this.speed;
        
        // Return true if enemy has moved off screen
        return this.y > GAME_CONSTANTS.DIMENSIONS.CANVAS.HEIGHT;
    }

    setImage(image) {
        this.image = image;
    }
}