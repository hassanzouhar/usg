import { GameObject } from '../core/gameObject.js';

export class Explosion extends GameObject {
    constructor(x, y) {
        super(x, y, 64, 64, null); // Standard size for explosion sprites
        
        // Animation properties
        this.frameIndex = 0;
        this.frameTime = 0;
        this.frameDuration = 50; // ms per frame
        this.totalFrames = 8;
        
        // Center the explosion on the given coordinates
        this.x -= this.width / 2;
        this.y -= this.height / 2;
    }

    update(deltaTime) {
        this.frameTime += deltaTime;
        
        if (this.frameTime >= this.frameDuration) {
            this.frameIndex++;
            this.frameTime = 0;
        }
    }

    draw(ctx) {
        if (this.isFinished() || !ctx) return;
        
        // Temporary visual representation if sprite sheet isn't loaded
        ctx.save();
        const opacity = 1 - (this.frameIndex / this.totalFrames);
        ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`; // Orange with fading opacity
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2,
            this.y + this.height / 2,
            (this.width / 2) * (1 - this.frameIndex / this.totalFrames),
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    }

    isFinished() {
        return this.frameIndex >= this.totalFrames;
    }
}

