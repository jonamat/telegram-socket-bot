import path from 'path';
import dotenv from 'dotenv';
import os from 'os';
import { MongoMemoryServer } from 'mongodb-memory-server';

const { DB_NAME /* DB_USER, DB_PWD, DB_URL_QUERY */ } = dotenv.config({
    path: path.resolve(__dirname, '..', 'dev.env'),
}).parsed as NodeJS.ProcessEnv;

const DEFAULT_TEST_PORT = 37017;

const startMongoMemoryServer = async (port?: number) => {
    if (!process.env.MONGOMS_SYSTEM_BINARY) {
        console.warn('Env key MONGOMS_SYSTEM_BINARY missing');
    }

    const MongoMemoryInstance = new MongoMemoryServer({
        instance: {
            // Temporary port - See https://github.com/nodkz/mongodb-memory-server/issues/330
            port: port || DEFAULT_TEST_PORT,
            dbName: DB_NAME,
            ip: 'localhost',
        },
        /**
         * ⚠ WARNING!!!
         * MongoDB used in production is v4.4.3, but it's not available in Alpine yet.
         * Download and use the system v4.0.5 instead.
         * See .devcontainer/Dockerfile for configuration
         */
        ...(!!process.env.MONGOMS_SYSTEM_BINARY && os.platform() === 'linux'
            ? {
                  binary: {
                      version: 'v4.0.5',
                      platform: 'linux',
                      arch: 'x64',
                      // downloadDir: path.resolve(__dirname, '..', '.devcontainer', 'cache', 'linux'),
                  },
              }
            : {}),
    });

    /*
    * For the version 7x of mongodb-memory-server: enable password authentication
    * For now, mock "mongoose.connect" to use db without auth settings

    const uri = await MongoMemoryInstance.getUri();
    const mongo = new MongoClient(uri);
    await mongo.connect();

    // Remove old user if exist
    const { users } = await mongo.db('admin').command({ usersInfo: 1 });
    if (users.find((user) => user.user === DB_USER)) {
        await mongo.db('admin').removeUser(DB_USER);
    }

    // Add a new user with the current credentials
    await mongo.db('admin').addUser(DB_USER, DB_PWD, {
        roles: [{ role: 'readWrite', db: DB_NAME }],
    });

    await mongo.close(true);

    // Restart instance to apply security edits
    await MongoMemoryInstance.stop();
    (MongoMemoryInstance.opts.instance as any).auth = true;
    (MongoMemoryInstance.opts.instance as any).port = 37017;
    await MongoMemoryInstance.start();

    */

    await MongoMemoryInstance.ensureInstance();

    return MongoMemoryInstance;
};

export default startMongoMemoryServer;
