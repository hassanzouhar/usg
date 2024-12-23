export const GAME_CONSTANTS = {
    DIMENSIONS: {
        PLAYER: { WIDTH: 50, HEIGHT: 50 },
        ENEMY: { WIDTH: 50, HEIGHT: 50 },
        BULLET: { WIDTH: 5, HEIGHT: 10 },
        POWERUP: { WIDTH: 50, HEIGHT: 50 },
        CANVAS: { WIDTH: 800, HEIGHT: 1000 }
    },
    GAMEPLAY: {
        INITIAL_LIVES: 10,
        INITIAL_SCORE: 0,
        INITIAL_LEVEL: 1,
        BULLET_SPEED: 7,
        SHOOTING_COOLDOWN: 150,
        ENEMY_SPAWN_INTERVAL: 2000,
        POWERUP_SPAWN_INTERVAL: 15000,
        POWERUP_SPAWN_CHANCE: 0.2,
        DIFFICULTY_INCREASE_INTERVAL: 300000
    },
    DEBUG: {
        COLLISIONS: false,
        POWERUPS: false,
        EXPLOSIONS: false,
        SOUND: true,
        ASSETS: true
    }
};