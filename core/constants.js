export const GAME_CONSTANTS = {
    DIMENSIONS: {
        PLAYER: { WIDTH: 50, HEIGHT: 50 },
        ENEMY: { WIDTH: 50, HEIGHT: 50 },
        BULLET: { WIDTH: 5, HEIGHT: 10 },
        POWERUP: { WIDTH: 30, HEIGHT: 30 },
        CANVAS: { WIDTH: 800, HEIGHT: 600 }
    },
    GAMEPLAY: {
        INITIAL_LIVES: 3,
        INITIAL_SCORE: 0,
        INITIAL_LEVEL: 1,
        BULLET_SPEED: 7,
        SHOOTING_COOLDOWN: 150,
        ENEMY_SPAWN_INTERVAL: 2000,
        ENEMY_SPEED_MIN: 1,
        ENEMY_SPEED_MAX: 2
    },
    POWERUP: {
        TYPES: {
            SHIELD: 'shield',
            RAPID_FIRE: 'rapidfire',
            MULTI_SHOT: 'multishot'
        },
        SPAWN_CHANCE: 0.01,
        DURATION: 5000,
        SPEED: 2
    }
};
