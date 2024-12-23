// Debug flags
const DEBUG = {
    COLLISIONS: false,
    POWERUPS: false,
    EXPLOSIONS: false,
    SOUND: true,
    ASSETS: true
};

export class Logger {
    static log(category, message, data = {}, color = '#ffffff') {
        if (!DEBUG[category.toUpperCase()]) return;
        console.log(`%c${category}`, `color: ${color}`, {
            message,
            ...data,
            timestamp: Date.now()
        });
    }

    static collision(obj1, obj2, overlap) {
        this.log('COLLISIONS', 'Collision detected', {
            object1: {
                type: obj1.constructor.name,
                x: Math.round(obj1.x),
                y: Math.round(obj1.y),
                width: obj1.width,
                height: obj1.height
            },
            object2: {
                type: obj2.constructor.name,
                x: Math.round(obj2.x),
                y: Math.round(obj2.y),
                width: obj2.width,
                height: obj2.height
            },
            overlap
        }, 'yellow');
    }

    static powerup(action, type, position) {
        this.log('POWERUPS', action, {
            type,
            position: position ? {
                x: Math.round(position.x),
                y: Math.round(position.y)
            } : undefined
        }, 'cyan');
    }

    static explosion(phase, data) {
        this.log('EXPLOSIONS', phase, data, 'orange');
    }

    static sound(type, message) {
        this.log('SOUND', message, {type}, 'green');
    }

    static asset(type, message) {
        this.log('ASSETS', message, {type}, 'blue');
    }

    static error(category, message, data = {}) {
        console.error(`%c${category} Error`, 'color: red', {
            message,
            ...data,
            timestamp: Date.now()
        });
    }
}
