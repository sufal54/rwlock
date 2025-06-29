type UnlockFn = () => void;
type DoneFn = () => void;
declare class RwLock<T> {
    private readers;
    private writer;
    private queue;
    private value;
    constructor(value: T);
    read(): Promise<[T, UnlockFn]>;
    write(): Promise<[T, DoneFn]>;
    setWrite(): Promise<[T, (val: T) => void]>;
    private releaseRead;
    private releaseWrite;
    private setReleaseWrite;
    private processQueue;
}
export default RwLock;
