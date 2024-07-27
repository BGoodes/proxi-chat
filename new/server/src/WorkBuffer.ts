export default class WorkBuffer {

    buffer: Buffer;
    offset: number;
    length: number;

    constructor() {
        this.buffer = Buffer.alloc(1024);
        this.offset = 0;
        this.length = 0;
    }

    goto(offset: number) {
        this.offset = offset;
        if (this.offset > this.length)
            this.length = this.offset;
    }

    skip(offset: number) {
        this.offset += offset;
        if (this.offset > this.length)
            this.length = this.offset;
    }

    writeUshort(value: number): boolean {
        if (this.offset + 2 > this.buffer.length)
            return false;
        this.buffer.writeUInt16BE(value, this.offset);
        this.offset += 2;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeByte(value: number): boolean {
        if (this.offset + 1 > this.buffer.length)
            return false;
        this.buffer.writeUInt8(value, this.offset);
        this.offset += 1;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeShort(value: number): boolean {
        if (this.offset + 2 > this.buffer.length)
            return false;
        this.buffer.writeInt16BE(value, this.offset);
        this.offset += 2;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeInt(value: number): boolean {
        if (this.offset + 4 > this.buffer.length)
            return false;
        this.buffer.writeInt32BE(value, this.offset);
        this.offset += 4;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeUInt(value: number): boolean {
        if (this.offset + 4 > this.buffer.length)
            return false;
        this.buffer.writeUInt32BE(value, this.offset);
        this.offset += 4;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeDouble(value: number): boolean {
        if (this.offset + 8 > this.buffer.length)
            return false;
        this.buffer.writeDoubleBE(value, this.offset);
        this.offset += 8;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeString(value: string): boolean {
        let length = Buffer.byteLength(value);
        if (this.offset + length > this.buffer.length)
            return false;
        this.buffer.write(value, this.offset);
        this.offset += length;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeBuffer(value: Buffer): boolean {
        if (this.offset + value.length > this.buffer.length)
            return false;
        value.copy(this.buffer, this.offset);
        this.offset += value.length;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeULong(value: bigint): boolean {
        if (this.offset + 8 > this.buffer.length)
            return false;
        this.buffer.writeBigUInt64BE(value, this.offset);
        this.offset += 8;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    writeLong(value: bigint): boolean {
        if (this.offset + 8 > this.buffer.length)
            return false;
        this.buffer.writeBigInt64BE(value, this.offset);
        this.offset += 8;
        if (this.offset > this.length)
            this.length = this.offset;
        return true;
    }

    readUshort(): number {
        let value = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    readByte(): number {
        let value = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readShort(): number {
        let value = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    readInt(): number {
        let value = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    readUInt(): number {
        let value = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    readDouble(): number {
        let value = this.buffer.readDoubleBE(this.offset);
        this.offset += 8;
        return value;
    }

    readString(): string {
        let length = this.readUshort();
        let value = this.buffer.subarray(this.offset, this.offset + length).toString();
        this.offset = length + 1;
        return value;
    }

    readBuffer(length: number): Buffer {
        let value = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    readULong(): bigint {
        let value = this.buffer.readBigUInt64BE(this.offset);
        this.offset += 8;
        return value;
    }

    readLong(): bigint {
        let value = this.buffer.readBigInt64BE(this.offset);
        this.offset += 8;
        return value;
    }

    reset() {
        this.offset = 0;
        this.length = 0;
    }

    clear() {
        this.offset = 0;
        this.length = 0;
        this.buffer.fill(0);
    }

    getBuffer(): Buffer {
        return this.buffer.slice(0, this.length);
    }

    getLength(): number {
        return this.length;
    }

    getOffset(): number {
        return this.offset;
    }
}


