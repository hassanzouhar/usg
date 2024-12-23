import { Logger } from '../core/logger.js';

export class CollisionManager {
    checkCollision(obj1, obj2) {
        const obj1Right = obj1.x + obj1.width;
        const obj1Bottom = obj1.y + obj1.height;
        const obj2Right = obj2.x + obj2.width;
        const obj2Bottom = obj2.y + obj2.height;

        const collision = (
            obj1.x < obj2Right &&
            obj1Right > obj2.x &&
            obj1.y < obj2Bottom &&
            obj1Bottom > obj2.y
        );

        if (collision) {
            const overlap = {
                x: Math.min(obj1Right, obj2Right) - Math.max(obj1.x, obj2.x),
                y: Math.min(obj1Bottom, obj2Bottom) - Math.max(obj1.y, obj2.y)
            };
            
            Logger.collision(obj1, obj2, overlap);
        }

        return collision;
    }

    checkBounds(obj, canvas) {
        return {
            left: obj.x > 0,
            right: obj.x < canvas.width - obj.width,
            top: obj.y > 0,
            bottom: obj.y < canvas.height - obj.height
        };
    }
}