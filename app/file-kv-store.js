const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirp = require('mkdirp');
const { KVNamespace, allLister } = require('./kv-namespace');

/** Reads a file's contents, returning null if the file couldn't be found */
async function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(null); // File not found
        } else {
          reject(err);
        }
      } else {
        resolve(data);
      }
    });
  });
}

/** Writes data to a file */
async function writeFile(filePath, data) {
  await mkdirp(path.dirname(filePath));
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/** Deletes a file, returning true if successful, or false if the file couldn't be found */
async function deleteFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(false); // File not found
        } else {
          reject(err);
        }
      } else {
        resolve(true);
      }
    });
  });
}

/** Gets a list of all files in a directory, returning an empty array if the directory couldn't be found */
async function readDir(filePath) {
  return new Promise((resolve, reject) => {
    fs.readdir(filePath,(err, files) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve([]); // Directory not found
        } else {
          reject(err);
        }
      } else {
        resolve(files);
      }
    });
  });
}

const stat = promisify(fs.stat);

/** Recursively traverses a directory and all its sub-directories, returning a list of relative file paths */
async function walkDir(rootPath) {
  const files = [];
  const fileNames = await readDir(rootPath);
  for (const fileName of fileNames) {
    const filePath = path.join(rootPath, fileName);
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      // Recurse into this subdirectory, adding all it's paths
      files.push(...(await walkDir(filePath)));
    } else {
      files.push(filePath);
    }
  }
  return files;
}

/** Suffix to add to key file names for the metadata file containing metadata and expiration information */
const metaSuffix = '.meta.json';

class FileKVStore {
  constructor(root = ".") {
    this.root = root;
  }

  static async getter(filePath) {
    // Try to get file data
    const value = await readFile(filePath);
    // If it didn't exist, return null
    if (value === null) return null;

    // Try to get file metadata
    const metadataValue = await readFile(filePath + metaSuffix);
    if (metadataValue === null) {
      // If it didn't exist, assume no expiration and metadata
      return { value, expiration: -1, metadata: null };
    } else {
      // Otherwise, if it did, JSON parse it and use it
      const { expiration, metadata } = JSON.parse(metadataValue);
      return { value, expiration, metadata };
    }
  }

  static async putter(filePath, { value, expiration, metadata }) {
    // Write file value
    await writeFile(filePath, value);

    const metaPath = filePath + metaSuffix;
    if (expiration !== -1 || metadata !== null) {
      // Write file metadata (if there is any)
      await writeFile(metaPath, JSON.stringify({ expiration, metadata }));
    } else {
      // Otherwise, delete any metadata from old writes
      await deleteFile(metaPath);
    }
  }

  static async remover(filePath) {
    // Delete file and any metadata
    await deleteFile(filePath);
    await deleteFile(filePath + metaSuffix);
  }

  static async lister(root, prefix, limit, startAfter) {
    const filePaths = await walkDir(root);
    const files = [];
    for (const filePath of filePaths) {
      // Ignore meta files
      if (filePath.endsWith(metaSuffix)) continue;
      // Get key name by removing root directory + path separator
      const name = filePath.substring(root.length + 1);
      // Try to get file metadata
      const metadataValue = await readFile(path.join(root, name + metaSuffix));
      if (metadataValue === null) {
        // If it didn't exist, assume no expiration and metadata
        files.push([name, { expiration: -1, metadata: null }]);
      } else {
        // Otherwise, if it did, JSON parse it and use it
        const { expiration, metadata } = JSON.parse(metadataValue);
        files.push([name, { expiration, metadata }]);
      }
    }
    return allLister(files, prefix, limit, startAfter);
  }

  getClient(namespace) {
    return new KVNamespace({
      getter: async (key) => FileKVStore.getter(path.join(this.root, namespace, key)),
      putter: async (key, data) => FileKVStore.putter(path.join(this.root, namespace, key), data),
      remover: async (key) => FileKVStore.remover(path.join(this.root, namespace, key)),
      lister: async (prefix, limit, startAfter) => FileKVStore.lister(path.join(this.root, namespace), prefix, limit, startAfter),
    });
  }
}

module.exports = { FileKVStore };
