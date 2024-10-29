interface CacheOptions<T extends object> {
    ttl?: number;
    keyGenerator?: (...args: any[]) => string;
    dependencies?: (this: T, ...args: any[]) => string[]; 
    condition?: (this: T, ...args: any[]) => boolean;
}

interface User {
    id: string;
    name: string;
}

function Cached<T extends object>(
    options: CacheOptions<T>
) {
    return function (
        target: T,
        propertyKey: string,
        descriptor: PropertyDescriptor
    )
    {
        const originalMethod = target[propertyKey];
        target[propertyKey] = function (...args: any[]) {
            const key = options.keyGenerator ? options.keyGenerator.apply(this, args) : propertyKey;
            if (options.condition && !options.condition.apply(this, args)) {
                return originalMethod.apply(this, args);
            }
            const cachedValue = localStorage.getItem(key);
            if (cachedValue) {
                return JSON.parse(cachedValue);
            }
            const result = originalMethod.apply(this, args);
            localStorage.setItem(key, JSON.stringify(result));
            return result;
        };
    };
}

class UserService {
    getCurrentOrg(): string {
        return '1';
    }
    isEnabled(): boolean {
        return true;
    }

    @Cached<UserService>({
        ttl: 30000,
        keyGenerator: (id: string) => `user-${id}`,
        dependencies: function (id : string) {
            return[`org:${this.getCurrentOrg()}`, `user:${id}`];
        },
        condition: function (id: string) {
            return this.isEnabled();
        }
    })
    async getUser(id: string): Promise<User> {
        await new Promise(resolve => setTimeout(resolve, 250));
        return { id, name: `User ${id}` };
    }
}

console.log(
    new UserService().getUser('1').then(user => console.log(user))
);