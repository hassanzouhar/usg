import { Logger } from '../core/logger.js';

export class AssetManager {
    constructor() {
        this.assets = {
            backgroundImage: null,
            playerImage: null,
            enemyImage: null,
            explosionImage: null,
            explosionSheet: null,
            shieldPowerUp: null,
            rapidFirePowerUp: null,
            multiShotPowerUp: null
        };
    }

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets[key] = img;
                Logger.asset('loaded', key);
                resolve(img);
            };
            img.onerror = () => {
                Logger.asset('error', key);
                reject(new Error(`Failed to load image: ${key}`));
            };
            img.src = src;
        });
    }

    async loadAssets() {
        try {
            await Promise.all([
                this.loadImage('backgroundImage', 'img/space-background.png'),
                this.loadImage('playerImage', 'img/player-ship.png'),
                this.loadImage('enemyImage', 'img/enemy-ship.png'),
                this.loadImage('explosionImage', 'img/explosion-sheet.png'),
                this.loadImage('shieldPowerUp', 'img/shield-powerup.png'),
                this.loadImage('rapidFirePowerUp', 'img/rapid-fire-powerup.png'),
                this.loadImage('multiShotPowerUp', 'img/multi-shot-powerup.png')
            ]);
            
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
}