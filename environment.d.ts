import { RateLimiterMongo } from 'rate-limiter-flexible';
import Collector from './src/utils/Collector';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TELEGRAM_BOT_TOKEN: string;
            DB_USER: string;
            DB_PWD: string;
            DB_HOST: string;
            DB_PORT: string;
            DB_NAME: string;
            DB_URL_QUERY: string;
            USERS_COLLECTION: string;
            ALIASES_COLLECTION: string;
            JWT_KEY: string;
            SUPPORT_EMAIL: string;
            CHATBOX_DOCS_LINK: string;
            LOG_DB_HOST: string;
            LOG_DB_PORT: string;
            LOG_DB_USER: string;
            LOG_DB_PWD: string;
            LOG_DB_NAME: string;
            LOG_TABLE_NAME: string;
        }

        interface Global {
            collector: Collector;
            rateLimiter: RateLimiterMongo;
        }
    }
}

export {};
