import fs from "fs";

export const readInt32 = (fd) => {
  var buffer = Buffer.alloc(4);
  var bytesRead = fs.readSync(fd, buffer);
  if (4 != bytesRead) {
    throw (
      "Error reading 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readInt32LE();
};

export const readUInt16 = (fd) => {
  var buffer = Buffer.alloc(2);
  var bytesRead = fs.readSync(fd, buffer);
  if (2 != bytesRead) {
    throw (
      "Error reading 16-bit unsigned integer from .wav file header. Expected 2 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readUInt16LE();
};

export const readUInt32 = (fd) => {
  var buffer = Buffer.alloc(4);
  var bytesRead = fs.readSync(fd, buffer);
  if (4 != bytesRead) {
    throw (
      "Error reading unsigned 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readUInt32LE();
};

export const readString = (fd, length) => {
  var buffer = Buffer.alloc(length);
  var bytesRead = fs.readSync(fd, buffer);
  if (length != bytesRead) {
    throw (
      "Error reading string from .wav file header. Expected " +
      String(length) +
      " bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.toString();
};
