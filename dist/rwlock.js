"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RwLock {
    constructor(value) {
        this.readers = 0;
        this.writer = false;
        this.queue = [];
        this.value = value;
    }
    read() {
        return new Promise((resolve) => {
            const task = () => {
                this.readers++;
                resolve([this.value, () => this.releaseRead()]);
            };
            this.queue.push({ type: 'read', fn: task });
            this.processQueue();
        });
    }
    write() {
        return new Promise((resolve) => {
            const task = () => {
                this.writer = true;
                resolve([this.value, () => this.releaseWrite()]);
            };
            this.queue.push({ type: 'write', fn: task });
            this.processQueue();
        });
    }
    setWrite() {
        return new Promise((resolve) => {
            const task = () => {
                this.writer = true;
                resolve([this.value, (val) => this.setReleaseWrite(val)]);
            };
            this.queue.push({ type: 'write', fn: task });
            this.processQueue();
        });
    }
    releaseRead() {
        this.readers--;
        if (this.readers < 0)
            throw new Error("Too many releaseRead calls");
        this.processQueue();
    }
    releaseWrite() {
        this.writer = false;
        this.processQueue();
    }
    setReleaseWrite(val) {
        this.value = val;
        this.writer = false;
        this.processQueue();
    }
    processQueue() {
        if (this.writer)
            return;
        while (this.queue.length > 0) {
            const next = this.queue[0];
            if (next.type === 'read') {
                if (this.queue.some(q => q.type === 'write'))
                    break; // block if a write is ahead
                this.queue.shift();
                next.fn();
            }
            else if (next.type === 'write') {
                if (this.readers === 0) {
                    this.queue.shift();
                    next.fn();
                }
                break;
            }
        }
    }
}
exports.default = RwLock;
