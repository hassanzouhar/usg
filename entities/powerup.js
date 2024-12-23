import { GAME_CONSTANTS } from '../core/constants.js';
import { GameObject } from '../core/gameObject.js';
import { Logger } from '../core/logger.js';

export class PowerUp extends GameObject {
    constructor(x, y, type) {
        // Normalize type and validate against constants
        const VALID_TYPES = GAME_CONSTANTS.POWERUP.TYPES;
        const normalizedType = type.toLowerCase();
        
        // Find matching type ignoring case
        const validType = Object.values(VALID_TYPES).find(t => 
            t.toLowerCase() === normalizedType
        );

        if (!validType) {
            console.warn(`Invalid powerup type: ${type}, defaulting to shield`);
            type = VALID_TYPES.SHIELD;
        }
        
        super(x, y, 
            GAME_CONSTANTS.DIMENSIONS.POWERUP.WIDTH,
            GAME_CONSTANTS.DIMENSIONS.POWERUP.HEIGHT,
            null // Image will be set by AssetManager
        );
        
        this.type = validType || VALID_TYPES.SHIELD;
        this.speed = GAME_CONSTANTS.POWERUP.SPEED;
        this.duration = GAME_CONSTANTS.GAMEPLAY.POWERUP_DURATION;
        
        // Set color based on type
        switch (normalizedType) {
            case GAME_CONSTANTS.POWERUP.TYPES.SHIELD:
                this.color = 'rgba(0, 255, 255, 0.7)';
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.RAPID_FIRE:
                this.color = 'rgba(255, 0, 0, 0.7)';
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.MULTI_SHOT:
                this.color = 'rgba(0, 255, 0, 0.7)';
                break;
            default:
                this.color = 'rgba(255, 255, 255, 0.7)';
        }
        
        Logger.powerup('create', this.type, {x, y});
    }

    move() {
        this.y += this.speed;
    }

    draw(ctx) {
        super.draw(ctx);
        
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        
        // Draw glowing circle
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2,
            this.y + this.height/2,
            this.width/2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }

    setImage(image) {
        this.image = image;
    }

    apply(player) {
        // Store current power-up timer for cleanup
        if (player.powerUpTimer) {
            clearTimeout(player.powerUpTimer);
        }

        switch (this.type) {
            case GAME_CONSTANTS.POWERUP.TYPES.SHIELD:
                player.isInvulnerable = true;
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.RAPID_FIRE:
                player.cooldownReduction = 0.5;
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.MULTI_SHOT:
                player.hasMultiShot = true;
                break;
        }

        // Set cleanup timer
        player.powerUpTimer = setTimeout(() => {
            this.remove(player);
        }, this.duration);

        Logger.powerup('activate', this.type, {x: this.x, y: this.y});
    }

    remove(player) {
        switch (this.type) {
            case GAME_CONSTANTS.POWERUP.TYPES.SHIELD:
                player.isInvulnerable = false;
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.RAPID_FIRE:
                player.cooldownReduction = 1;
                break;
            case GAME_CONSTANTS.POWERUP.TYPES.MULTI_SHOT:
                player.hasMultiShot = false;
                break;
        }
        Logger.powerup('deactivate', this.type);
    }
}