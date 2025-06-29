type UnlockFn = () => void;
type DoneFn = () => void;

type LockTask = {
    type: 'read' | 'write';
    fn: () => void;
};

class RwLock<T> {
    private readers = 0;
    private writer = false;
    private queue: LockTask[] = [];
    private value: T;

    constructor(value: T) {
        this.value = value;
    }

    read(): Promise<[T, UnlockFn]> {
        return new Promise((resolve) => {
            const task = () => {
                this.readers++;
                resolve([this.value, () => this.releaseRead()]);
            };

            this.queue.push({ type: 'read', fn: task });
            this.processQueue();
        });
    }

    write(): Promise<[T, DoneFn]> {
        return new Promise((resolve) => {
            const task = () => {
                this.writer = true;
                resolve([this.value, () => this.releaseWrite()]);
            };

            this.queue.push({ type: 'write', fn: task });
            this.processQueue();
        });
    }

    setWrite(): Promise<[T, (val: T) => void]> {
        return new Promise((resolve) => {
            const task = () => {
                this.writer = true;
                resolve([this.value, (val: T) => this.setReleaseWrite(val)]);
            };

            this.queue.push({ type: 'write', fn: task });
            this.processQueue();
        });
    }

    private releaseRead() {
        this.readers--;
        if (this.readers < 0) throw new Error("Too many releaseRead calls");
        this.processQueue();
    }

    private releaseWrite() {
        this.writer = false;
        this.processQueue();
    }

    private setReleaseWrite(val: T) {
        this.value = val;
        this.writer = false;
        this.processQueue();
    }

    private processQueue() {
        if (this.writer) return;

        while (this.queue.length > 0) {
            const next = this.queue[0];

            if (next.type === 'read') {
                if (this.queue.some(q => q.type === 'write')) break; // block if a write is ahead
                this.queue.shift();
                next.fn();
            } else if (next.type === 'write') {
                if (this.readers === 0) {
                    this.queue.shift();
                    next.fn();
                }
                break;
            }
        }
    }
}

export default RwLock;
