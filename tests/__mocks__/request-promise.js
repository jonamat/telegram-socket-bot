// mock node-telegram-bot-api polling system to prevent requests to telegram apis

global._updates = [];

const makeResult = (type) => {
    switch (type) {
        case 'getUpdates': {
            const updates = global._updates;
            global._updates = [];
            return updates;
        }
        case 'getMe':
            return {
                id: 1234,
                is_bot: true,
            };
        default:
            return {
                id: 1234,
            };
    }
};

const request = (opts) => {
    if (opts.__setUpdates) {
        global._updates = opts.__setUpdates;
        return;
    }
    const type = /.*\/(.*)$/.exec(opts.url)?.[1];

    return Promise.resolve({
        body: JSON.stringify({
            ok: true,
            result: makeResult(type),
        }),
    });
};

module.exports = request;
