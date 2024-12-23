import { GAME_CONSTANTS } from './core/constants.js';
import { GameObject } from './core/game.js';

export class Bullet extends GameObject {
    constructor(x, y) {
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.BULLET.WIDTH, 
            GAME_CONSTANTS.DIMENSIONS.BULLET.HEIGHT,
            null
        );
        this.speed = GAME_CONSTANTS.GAMEPLAY.BULLET_SPEED;
        this.angle = 0;
    }

    move() {
        const radians = this.angle * Math.PI / 180;
        this.x += Math.sin(radians) * this.speed;
        this.y -= Math.cos(radians) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
        
        if (GAME_CONSTANTS.DEBUG.COLLISIONS) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}