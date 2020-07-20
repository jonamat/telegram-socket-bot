import path from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import { Server } from 'socket.io';
import { RateLimiterMongo } from 'rate-limiter-flexible';

import { defaultHTTPPort, mongoConnectionTimeout, rateLimitConfig, telegramApiEmulatorAddress } from './config';
import report, { initLogDatabase, Category } from './utils/report';
import serverFault from './utils/serverFault';
import TelegramBotExt from './utils/TelegramBotExt';
import Collector from './utils/Collector';

// Socket middlewares
import socketLogger from './middlewares/socket/logger';
import socketAuth from './middlewares/socket/auth';

// Bot middlewares
import botLogger from './middlewares/bot/logger';
import botRefusesUnidentified from './middlewares/bot/rejectUnknownUsers';
import botAuth from './middlewares/bot/auth';

// Routes
import routeSocket from './routes/socket';
import routeBot from './routes/bot';
import rateLimiter from './middlewares/socket/rateLimiter';

const devMode = !!process.argv[2];
dotenv.config({ path: path.resolve(__dirname, '..', devMode ? 'dev.env' : 'prod.env') });
global.collector = new Collector();

/* -------------------------------------------------------------------------- */
/*                              Global listeners                              */
/* -------------------------------------------------------------------------- */

process.on('uncaughtException', (error) => serverFault(error, true));
process.on('unhandledRejection', (error) => serverFault(new Error(`Unhandled rejection: ${error}`), false));

/* -------------------------------------------------------------------------- */
/*                         Server configuration checks                        */
/* -------------------------------------------------------------------------- */

const REQUIRED_ENV_KEYS = [
    'TELEGRAM_BOT_TOKEN',
    'DB_PROTOCOL',
    'DB_USER',
    'DB_PWD',
    'DB_HOST',
    // 'DB_PORT', Ports not accepted with 'mongodb+srv' URIs
    'DB_NAME',
    'DB_URL_QUERY',
    'USERS_COLLECTION',
    'ALIASES_COLLECTION',
    'JWT_KEY',
    'SUPPORT_EMAIL',
    'CHATBOX_DOCS_LINK',
    'LOG_DB_HOST',
    'LOG_DB_PORT',
    'LOG_DB_USER',
    'LOG_DB_PWD',
    'LOG_DB_NAME',
    'LOG_TABLE_NAME',
];

REQUIRED_ENV_KEYS.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Required env key "${key}" is missing.`);
    }
});

if (!!process.argv[2]) {
    const port = parseInt(process.argv[2]);
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Invalid argument. Server port must be valid');
    }
}

/* -------------------------------------------------------------------------- */
/*                                Main database                               */
/* -------------------------------------------------------------------------- */

const { DB_PROTOCOL, DB_USER, DB_PWD, DB_HOST, DB_PORT, DB_NAME, DB_URL_QUERY } = process.env;
const dbUrl = `${DB_PROTOCOL}://${DB_HOST}${DB_PORT ? ':' + DB_PORT : ''}/${DB_NAME}?${DB_URL_QUERY}`;

mongoose
    .connect(dbUrl, {
        user: DB_USER,
        pass: DB_PWD,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: mongoConnectionTimeout,
    })
    .then(({ connection }) => {
        console.info(`Main database connected to ${connection.host} on port ${connection.port}`);
        connection.on('error', serverFault);
    })
    .catch((error) => {
        serverFault(new Error(`Main database connection error: ${error}`), true);
    });

/* -------------------------------------------------------------------------- */
/*                                Log database                                */
/* -------------------------------------------------------------------------- */

initLogDatabase()
    .then(({ config }) => {
        console.info(`Log database connected to ${config.host} on port ${config.port}`);
    })
    .catch((error) => {
        serverFault(new Error(`Log database connection error: ${error?.message}`), true);
    });

/* -------------------------------------------------------------------------- */
/*                                 HTTP server                                */
/* -------------------------------------------------------------------------- */

const app = express();
// Future implementation
// app.use(rateLimit(rateLimitConfig))
const httpServer = createServer(app);

httpServer.on('error', function (error) {
    report.fault({
        category: Category.SYSTEM,
        description: error,
    });
    serverFault(new Error(`HTTP server error: ${error.message}`), true);
});

/* -------------------------------------------------------------------------- */
/*                              WebSocket server                              */
/* -------------------------------------------------------------------------- */

global.rateLimiter = new RateLimiterMongo({
    storeClient: mongoose.connection,
    points: rateLimitConfig.maxConnections,
    duration: rateLimitConfig.timeout,
});

const webSocketServer = new Server(httpServer, {
    path: '/socket',
    cors: {
        origin: '*',
        credentials: true,
    },
    serveClient: false,
});

/* -------------------------------------------------------------------------- */
/*                             Telegram API driver                            */
/* -------------------------------------------------------------------------- */

const { TELEGRAM_BOT_TOKEN } = process.env;
const telegramBotServer = new TelegramBotExt(TELEGRAM_BOT_TOKEN, {
    polling: { interval: 1000 },
    logger: report,
    // Use telegram-api-cli emulator in devmode instead of real Telegram servers
    baseApiUrl: devMode ? telegramApiEmulatorAddress : undefined,
});

telegramBotServer.on('polling_error', (error) => {
    console.log(error);
    serverFault(new Error(`Connection to Telegram server lost: ${error.message}`));
});

/* -------------------------------------------------------------------------- */
/*                            Middlewares & routing                           */
/* -------------------------------------------------------------------------- */

[botLogger, botRefusesUnidentified, botAuth].forEach((middleware) => telegramBotServer.use(middleware));
routeBot(telegramBotServer);

[socketLogger, rateLimiter, socketAuth].forEach((middleware) => webSocketServer.use(middleware));
routeSocket(webSocketServer);

/* -------------------------------------------------------------------------- */
/*                                Start server                                */
/* -------------------------------------------------------------------------- */

const port = parseInt(process.argv[2]) || defaultHTTPPort;

httpServer.listen(port, () => {
    report.info({
        category: Category.SYSTEM,
        description: 'Server started',
    });

    console.info(`Server listening on port ${port}`);
});

export default httpServer;
