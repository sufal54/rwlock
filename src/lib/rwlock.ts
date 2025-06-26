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

    async reads(): Promise<[T, UnlockFn]> {
        if (!this.writer) {
            this.readers++;
            return [this.value, () => this.releaseRead()]
        }

        return new Promise((res) => {
            const tryLock = () => {
                this.readers++;
                res([this.value, () => this.releaseRead()]);
            }
            this.readQueue.push(tryLock);
        })
    }

    async write(): Promise<[T, DoneFn]> {
        if (!this.writer && this.readers === 0) {
            this.writer = true;
            return [this.value, () => this.releaseWrite()];
        }

        return new Promise((res) => {
            const tryLock = () => {
                this.writer = true;
                res([this.value, () => this.releaseWrite()]);
            };
            this.writeQueue.push(tryLock);
        });
    }

    async setWrite(): Promise<[T, (newValue: T) => void]> {
        if (!this.writer && this.readers === 0) {
            this.writer = true;
            return [this.value, (newValue: T) => this.setReleaseWrite(newValue)];
        }
        return new Promise((res) => {
            const tryLock = () => {
                this.writer = true;
                res([this.value, (newValue: T) => this.setReleaseWrite(newValue)]);
            }
            this.writeQueue.push(tryLock);
        })
    }

    private releaseRead() {
        this.readers--;
        this.next();
    }

    private setReleaseWrite(newValue: T) {
        this.value = newValue;
        this.writer = false;
        this.next();
    }

    private releaseWrite() {
        this.writer = false;
        this.next();
    }

    private next() {
        if (this.writer && this.readers == 0 && this.writeQueue.length > 0) {
            const nextWriter = this.writeQueue.shift()!;
            nextWriter();
        } else if (!this.writer && this.writeQueue.length == 0) {

            while (this.readQueue.length > 0) {
                const nextReader = this.readQueue.shift()!;
                nextReader()
            }
        }
    }
}

export default RwLock;