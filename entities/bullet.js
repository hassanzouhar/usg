import { GameObject } from '../core/gameObject.js';
import { GAME_CONSTANTS } from '../core/constants.js';

export class Bullet extends GameObject {
    constructor(x, y) {
        super(x, y,
            GAME_CONSTANTS.DIMENSIONS.BULLET.WIDTH,
            GAME_CONSTANTS.DIMENSIONS.BULLET.HEIGHT,
            null
        );
        this.speed = GAME_CONSTANTS.GAMEPLAY.BULLET_SPEED;
        this.angle = 0; // Default angle (straight up)
        this.active = true;
    }

    move(speed) {
        // Use provided speed parameter
        this.y -= speed;
    }

    draw(ctx) {
        if (!ctx) return;
        
        ctx.save();
        
        // Draw bullet with glow effect
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(
            Math.round(this.x), 
            Math.round(this.y), 
            this.width, 
            this.height
        );
        
        ctx.restore();
        
        // Draw collision box in debug mode
        if (GAME_CONSTANTS.DEBUG?.COLLISIONS) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    setAngle(angle) {
        this.angle = angle;
    }

    isOffScreen(canvasWidth, canvasHeight) {
        return this.y < -this.height || 
            this.y > canvasHeight ||
            this.x < -this.width ||
            this.x > canvasWidth;
    }
}
