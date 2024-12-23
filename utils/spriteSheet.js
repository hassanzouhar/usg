import { Logger } from '../core/logger.js';

export class SpriteSheet {
    constructor(image, frameWidth, frameHeight) {
        if (!image || !image.complete) {
            throw new Error('Invalid or incomplete image provided to SpriteSheet');
        }

        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frames = [];
        
        // Calculate frames
        const cols = Math.floor(image.width / frameWidth);
        const rows = Math.floor(image.height / frameHeight);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.frames.push({
                    x: col * frameWidth,
                    y: row * frameHeight,
                    width: frameWidth,
                    height: frameHeight
                });
            }
        }
        
        Logger.asset('init', `SpriteSheet initialized with ${this.frames.length} frames`);
    }

    drawFrame(ctx, frameNumber, x, y, width, height) {
        if (frameNumber < 0 || frameNumber >= this.frames.length) {
            Logger.asset('error', `Invalid frame number: ${frameNumber}`);
            return;
        }

        const frame = this.frames[frameNumber];
        try {
            ctx.drawImage(
                this.image,
                frame.x, frame.y,
                frame.width, frame.height,
                x, y,
                width || frame.width,
                height || frame.height
            );
        } catch (error) {
            Logger.asset('error', 'Error drawing sprite frame');
        }
    }

    getFrameCount() {
        return this.frames.length;
    }
}

export class ExplosionEffect extends SpriteSheet {
    constructor(x, y, image) {
        super(image, 64, 64);
        this.x = x;
        this.y = y;
        this.frameIndex = 0;
        this.frameTime = 0;
        this.frameDuration = 50;
        this.totalFrames = 8;
    }

    update() {
        this.frameTime += 16;
        if (this.frameTime >= this.frameDuration) {
            this.frameIndex++;
            this.frameTime = 0;
        }
    }

    isFinished() {
        return this.frameIndex >= this.totalFrames;
    }
}
