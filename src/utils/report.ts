import mysql from 'mysql2';
import { escape } from 'sqlstring';
import { LogTableColumn, mysqlConnectionAttempts, mysqlConnectionInterval } from '../config';

let connection: mysql.Connection | undefined;
export const isConnected = !!connection;

type ReportOptions = Omit<RecordOption, 'priority'>;
const enum Priority {
    FAULT,
    ERROR,
    WARNING,
    NOTEWORTHY,
    INFO,
}
export const enum Category {
    SYSTEM = 'system',
    SOCKET = 'socket',
    BOT = 'bot',
    DATABASE = 'database',
}

export const enum SystemInvolved {
    AUTH = 'auth',
    CONNECTION = 'connection',
    COMMUNICATION = 'communication',
}

export const enum IdentifierType {
    USER_ID = 'user_id',
    TELEGRAM_ID = 'telegram_id',
    SOCKET_ID = 'socket_id',
}

export interface Identity {
    type: IdentifierType;
    identifier: string | number;
}

export interface Origin {
    module: string;
    code?: string | number;
}

export type RecordOption = {
    priority: Priority;
    category: Category;
    description: Error | string;
    systemInvolved?: SystemInvolved;
    identity?: Identity;
    origin?: Origin;
    details?: Array<string> | string | any;
};

export const initLogDatabase = async () => {
    const { LOG_DB_HOST, LOG_DB_USER, LOG_DB_PWD, LOG_DB_NAME, LOG_DB_PORT } = process.env;
    let error;

    const _connection = mysql.createConnection({
        host: LOG_DB_HOST,
        port: parseInt(LOG_DB_PORT),
        user: LOG_DB_USER,
        password: LOG_DB_PWD,
        database: LOG_DB_NAME,
    });

    for (let i = 1; i < mysqlConnectionAttempts; i++) {
        error = await new Promise<null | mysql.QueryError>((res) => {
            _connection.connect(res);
        });

        if (error) {
            console.log(`Connection to log database attempt n.${i} failed with error: `, error);
            await new Promise((res) => setTimeout(res, mysqlConnectionInterval));
        } else {
            _connection.on('error', (error) => {
                console.log('Log database error: \n', error);
            });
            break;
        }
    }

    if (error) throw new Error(error);

    connection = _connection;
    return _connection;
};

const log = ({ priority, category, description, systemInvolved, identity, origin, details }: RecordOption) => {
    const { LOG_TABLE_NAME } = process.env;

    if (!connection) {
        return console.error(`Log database not yet initialized - Skipped log: ${description}`);
    }

    if (typeof details === 'string') {
        details = [details];
    }

    if (description instanceof Error) {
        if (!!details) details.unshift(description.message);
        else details = [description.message, ...(description.stack ? description.stack : [])];
        description = description.name;
    }

    if (!!identity && typeof identity.identifier === 'number') {
        identity.identifier = identity.identifier.toString();
    }

    if (!!origin && typeof origin.code === 'number') {
        origin.code = origin.code.toString();
    }

    if (!Array.isArray(details) && typeof details !== 'string') {
        details = JSON.stringify(details);
    }

    const queryValues = [
        new Date(),
        priority,
        category,
        description,
        systemInvolved,
        identity?.type,
        identity?.identifier,
        origin?.module,
        origin?.code,
        details,
    ]
        .map((value) => escape(value))
        .join();

    connection.query(
        `INSERT INTO ${LOG_TABLE_NAME} ( ${Object.values(LogTableColumn).join()} ) VALUES ( ${queryValues} )`,
        (error) => {
            if (error) console.error('Log database error on query: \n', error);
        },
    );
};

const report = {
    info: (opts: ReportOptions) => log({ priority: Priority.INFO, ...opts }),
    noteworthy: (opts: ReportOptions) => log({ priority: Priority.NOTEWORTHY, ...opts }),
    warning: (opts: ReportOptions) => log({ priority: Priority.WARNING, ...opts }),
    error: (opts: ReportOptions) => log({ priority: Priority.ERROR, ...opts }),
    fault: (opts: ReportOptions) => log({ priority: Priority.FAULT, ...opts }),
};

export default report;
