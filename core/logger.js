export class Logger {
    static log(category, message, data, color) {
        if (!GAME_CONSTANTS.DEBUG[category]) return;
        console.log(`%c${category}`, `color: ${color}`, {
            message,
            ...data,
            timestamp: Date.now()
        });
    }
}