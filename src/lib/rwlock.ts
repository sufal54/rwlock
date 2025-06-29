type UnlockFn = () => void;
type DoneFn = () => void;

class RwLock<T> {
    private readers = 0;
    private writer = false;
    private readQueue: (() => void)[] = [];
    private writeQueue: (() => void)[] = [];
    private value: T;

    constructor(value: T) {
        this.value = value;
    }

    async read(): Promise<[T, UnlockFn]> {
        return new Promise((res) => {
            const tryLock = () => {
                // Only allow read if no active writer and no writer waiting
                if (!this.writer && this.writeQueue.length === 0) {
                    this.readers++;
                    res([this.value, () => this.releaseRead()]);
                } else {
                    this.readQueue.push(tryLock);
                }
            };
            tryLock(); // Immediately attempt
        });
    }

    async write(): Promise<[T, DoneFn]> {
        return new Promise((res) => {
            const tryLock = () => {
                if (!this.writer && this.readers === 0) {
                    this.writer = true;
                    res([this.value, () => this.releaseWrite()]);
                } else {
                    this.writeQueue.push(tryLock);
                }
            };
            tryLock(); // Immediately attempt
        });
    }

    async setWrite(): Promise<[T, (newValue: T) => void]> {
        return new Promise((res) => {
            const tryLock = () => {
                if (!this.writer && this.readers === 0) {
                    this.writer = true;
                    res([this.value, (newValue: T) => this.setReleaseWrite(newValue)]);
                } else {
                    this.writeQueue.push(tryLock);
                }
            };
            tryLock(); // Immediately attempt
        });
    }

    private releaseRead() {
        if (--this.readers < 0) {
            throw new Error("RwLock: releaseRead called too many times");
        }
        this.next();
    }

    private releaseWrite() {
        this.writer = false;
        this.next();
    }

    private setReleaseWrite(newValue: T) {
        this.value = newValue;
        this.writer = false;
        this.next();
    }

    private next() {
        // Priority: Writer if no one else active
        if (!this.writer && this.readers === 0 && this.writeQueue.length > 0) {
            const nextWriter = this.writeQueue.shift()!;
            nextWriter();
        }
        // If no writers, allow all readers
        else if (!this.writer && this.writeQueue.length === 0) {
            while (this.readQueue.length > 0) {
                const nextReader = this.readQueue.shift()!;
                nextReader();
            }
        }
    }
}

export default RwLock;
