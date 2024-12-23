import { GAME_CONSTANTS } from '../core/constants.js';
import { Logger } from '../core/logger.js';

class SoundPool {
    constructor(audioBuffer, poolSize) {
        this.audioBuffer = audioBuffer;
        this.sources = Array(poolSize).fill(null);
        this.currentIndex = 0;
    }

    play() {
        const source = AUDIO_CONTEXT.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(AUDIO_CONTEXT.destination);
        
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
        this.AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
    }

    async loadSound(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.AUDIO_CONTEXT.decodeAudioData(arrayBuffer);
        this.buffers[name] = audioBuffer;
        this.sounds[name] = new SoundPool(audioBuffer, GAME_CONSTANTS.SOUND.POOL_SIZE);
        Logger.sound('load', name);
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