export const rateLimitConfig = {
    maxConnections: 60,
    timeout: 3600,
    message: 'Too many request from this IP, please try again in an hour',
};

export const defaultDBErrorMessage = 'I cannot connect to the database. Try later';
export const defaultHTTPPort = 80;

export const mongoConnectionTimeout = 10000;

export const mysqlConnectionAttempts = 10;
export const mysqlConnectionInterval = 3000;

export const telegramApiEmulatorAddress = 'http://localhost:5000';

export enum LogTableColumn {
    DATE = 'date',
    PRIORITY = 'priority',
    CATEGORY = 'category',
    DESCRIPTION = 'description',
    SYSTEM = 'system_involved',
    IDENTIFIER_TYPE = 'identity_type',
    IDENTIFIER = 'identity_identifier',
    MODULE = 'origin_module',
    CODE = 'origin_code',
    DETAILS = 'details',
}
