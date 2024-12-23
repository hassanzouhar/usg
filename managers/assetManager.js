import { Logger } from '../core/logger.js';

class SpriteSheet {
    constructor(image, frameWidth, frameHeight) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frames = [];
        
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
            Logger.error('SPRITE', `Invalid frame number: ${frameNumber}`);
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
            Logger.error('SPRITE', 'Error drawing sprite frame', error);
        }
    }
}

export class AssetManager {
    constructor() {
        this.assets = {
            backgroundImage: null,
            playerImage: null,
            enemyImage: null,
            explosionImage: null,
            explosionSheet: null,
            powerUps: {
                shield: null,
                rapidFire: null,
                multiShot: null
            }
        };
        this.loadingPromises = [];
    }

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.setNestedValue(this.assets, key, image);
                Logger.asset('loaded', `Image loaded: ${key}`);
                resolve();
            };
            image.onerror = () => {
                Logger.error('ASSETS', `Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            image.src = src;
        });
    }

    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    async loadAssets() {
        try {
            // Load regular images
            this.loadingPromises = [
                this.loadImage('backgroundImage', 'img/space-background.png'),
                this.loadImage('playerImage', 'img/player-ship.png'),
                this.loadImage('enemyImage', 'img/enemy-ship.png'),
                this.loadImage('explosionImage', 'img/explosion-sheet.png'),
                this.loadImage('powerUps.shield', 'img/shield-powerup.png'),
                this.loadImage('powerUps.rapidFire', 'img/rapid-fire-powerup.png'),
                this.loadImage('powerUps.multiShot', 'img/multi-shot-powerup.png')
            ];

            await Promise.all(this.loadingPromises);
            
            // Initialize explosion spritesheet if needed
            if (this.assets.explosionImage) {
                this.assets.explosionSheet = new SpriteSheet(
                    this.assets.explosionImage,
                    64, // frame width
                    64  // frame height
                );
            }
        } catch (error) {
            Logger.asset('error', 'Failed to load assets');
            throw error;
        }
    }

    getAsset(key) {
        return this.assets[key];
    }

    getAssets() {
        return this.assets;
    }
    }
