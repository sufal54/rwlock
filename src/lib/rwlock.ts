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

    read(): Promise<[T, UnlockFn]> {
        return new Promise((resolve) => {
            const attempt = () => {
                if (!this.writer && this.writeQueue.length === 0) {
                    this.readers++;
                    resolve([this.value, () => this.releaseRead()]);
                } else {
                    this.readQueue.push(attempt);
                }
            };
            this.enqueue(attempt);
        });
    }

    write(): Promise<[T, DoneFn]> {
        return new Promise((resolve) => {
            const attempt = () => {
                if (!this.writer && this.readers === 0) {
                    this.writer = true;
                    resolve([this.value, () => this.releaseWrite()]);
                } else {
                    this.writeQueue.push(attempt);
                }
            };
            this.enqueue(attempt);
        });
    }

    setWrite(): Promise<[T, (newValue: T) => void]> {
        return new Promise((resolve) => {
            const attempt = () => {
                if (!this.writer && this.readers === 0) {
                    this.writer = true;
                    resolve([this.value, (val: T) => this.setReleaseWrite(val)]);
                } else {
                    this.writeQueue.push(attempt);
                }
            };
            this.enqueue(attempt);
        });
    }

    private enqueue(fn: () => void) {
        // Ensures function is run after current stack
        setImmediate(fn);
    }

    private releaseRead() {
        this.readers--;
        if (this.readers < 0) throw new Error("releaseRead called too many times");
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
        if (!this.writer && this.readers === 0 && this.writeQueue.length > 0) {
            const writer = this.writeQueue.shift()!;
            writer();
        } else if (!this.writer && this.writeQueue.length === 0) {
            while (this.readQueue.length > 0) {
                const reader = this.readQueue.shift()!;
                reader();
            }
        }
    }
}

export default RwLock;
