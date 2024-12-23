import { GAME_CONSTANTS } from '../core/constants.js';
import { Logger } from '../core/logger.js';

class SoundPool {
    constructor(audioBuffer, poolSize, audioContext) {
        this.audioBuffer = audioBuffer;
        this.sources = Array(poolSize).fill(null);
        this.currentIndex = 0;
        this.audioContext = audioContext;
    }

    play() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(this.audioContext.destination);
        
        if (this.sources[this.currentIndex]) {
            this.sources[this.currentIndex].disconnect();
        }
        
        this.sources[this.currentIndex] = source;
        source.start(0);
        this.currentIndex = (this.currentIndex + 1) % this.sources.length;
    }
}

export class SoundManager {
    constructor() {
        this.buffers = {};
        this.sounds = {};
        this.muted = false;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
            this.sounds[name] = new SoundPool(audioBuffer, this.poolSize, this.audioContext);
            Logger.sound('load', `Sound ${name} loaded successfully`);
        } catch (error) {
            Logger.error('SOUND', `Failed to load sound: ${name}`, error);
            throw error;
        }
    }

    async init() {
        await Promise.all([
            this.loadSound('shoot', 'sounds/shoot.wav'),
            this.loadSound('explosion', 'sounds/explosion.wav'),
            this.loadSound('powerUp', 'sounds/powerup.wav'),
            this.loadSound('gameOver', 'sounds/gameover.wav')
        ]);
    }

    play(soundName) {
        if (this.muted || !this.sounds[soundName]) return;
        this.sounds[soundName].play();
        Logger.sound('play', soundName);
    }

    toggleMute() {
        this.muted = !this.muted;
        Logger.sound(this.muted ? 'mute' : 'unmute');
    }
}