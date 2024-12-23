import { GAME_CONSTANTS } from './core/constants.js';
import { GameObject } from './core/game.js';

export class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.PLAYER.WIDTH, 
            GAME_CONSTANTS.DIMENSIONS.PLAYER.HEIGHT, 
            null  // Image will be set by AssetManager
        );
        this.speed = 5;
        this.hasMultiShot = false;
        this.hasRapidFire = false;
        this.cooldownReduction = 1; // 1 = normal, 0.5 = twice as fast
    }

    move(keys, canvasWidth, canvasHeight) {
        const diagonalSpeed = this.speed * 0.707; // For diagonal movement
        
        if (keys.ArrowLeft && keys.ArrowUp && this.x > 0 && this.y > 0) {
            this.x -= diagonalSpeed;
            this.y -= diagonalSpeed;
        } else if (keys.ArrowLeft && keys.ArrowDown && this.x > 0 && this.y < canvasHeight - this.height) {
            this.x -= diagonalSpeed;
            this.y += diagonalSpeed;
        } else if (keys.ArrowRight && keys.ArrowUp && this.x < canvasWidth - this.width && this.y > 0) {
            this.x += diagonalSpeed;
            this.y -= diagonalSpeed;
        } else if (keys.ArrowRight && keys.ArrowDown && this.x < canvasWidth - this.width && this.y < canvasHeight - this.height) {
            this.x += diagonalSpeed;
            this.y += diagonalSpeed;
        } else {
            if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;
            if (keys.ArrowRight && this.x < canvasWidth - this.width) this.x += this.speed;
            if (keys.ArrowUp && this.y > 0) this.y -= this.speed;
            if (keys.ArrowDown && this.y < canvasHeight - this.height) this.y += this.speed;
        }
    }

    setImage(image) {
        this.image = image;
    }
}