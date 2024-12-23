import { GAME_CONSTANTS } from './core/constants.js';
import { GameObject } from './core/game.js';
import { Logger } from './core/logger.js';

export class PowerUp extends GameObject {
    constructor(x, y, type) {
        const normalizedType = type.toLowerCase();
        if (!GAME_CONSTANTS.POWERUP_TYPES[normalizedType]) {
            Logger.powerup('error', `Invalid type: ${type}`);
            type = 'shield'; // Default to shield
        }
        
        const powerUpConfig = GAME_CONSTANTS.POWERUP_TYPES[normalizedType];
        
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.POWERUP.WIDTH,
            GAME_CONSTANTS.DIMENSIONS.POWERUP.HEIGHT,
            null // Image will be set by AssetManager
        );
        
        this.type = normalizedType;
        this.config = powerUpConfig;
        this.speed = GAME_CONSTANTS.GAMEPLAY.POWERUP_SPEED;
        
        Logger.powerup('create', this.type, {x, y});
    }

    move() {
        this.y += this.speed;
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.config && this.config.color) {
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2, 
                this.y + this.height/2,
                this.width * 0.6, 
                0, 
                Math.PI * 2
            );
            ctx.strokeStyle = this.config.color;
            ctx.stroke();
        }
    }

    setImage(image) {
        this.image = image;
    }

    activate(player) {
        if (!this.config || !this.config.effect) return;
        
        // Apply power-up effect
        this.config.effect(player);
        
        Logger.powerup('activate', this.type, {
            x: this.x,
            y: this.y
        });
    }
}