import { GAME_CONSTANTS } from '../core/constants.js';
import { GameObject } from '../core/gameObject.js';

export class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.PLAYER.WIDTH, 
            GAME_CONSTANTS.DIMENSIONS.PLAYER.HEIGHT
        );
        this.isInvulnerable = false;
        this.hasMultiShot = false;
        this.cooldownReduction = 1;
        this.powerUpTimer = null;
        this.speed = GAME_CONSTANTS.GAMEPLAY.PLAYER_SPEED || 5;
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

    takeDamage(amount) {
        if (!this.isInvulnerable) {
            this.health = Math.max(0, this.health - amount);
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    draw(ctx) {
        super.draw(ctx);
        
        // Draw invulnerability effect if active
        if (this.isInvulnerable) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
