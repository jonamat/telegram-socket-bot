/**
 * Download MongoDB binaries for MongoMemoryServer
 */

import path from 'path';
import MongoBinary from 'mongodb-memory-server-core/lib/util/MongoBinary';
import { MongoBinaryOpts } from 'mongodb-memory-server-core/lib/util/MongoBinary';

const binary: MongoBinaryOpts = {
    version: '4.4.3',
    downloadDir: path.resolve(__dirname, '..', '.devcontainer', 'cache'),
    // Fix container-dependent opts
    platform: 'linux',
    arch: 'x64',
};

MongoBinary.getPath(binary)
    .then((path) => console.log(`Mongo ${binary.version} binaries downloaded in ${path}`))
    .catch(console.error);
