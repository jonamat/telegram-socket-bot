export default {
    sign: jest.fn((token) => JSON.stringify(token)),
    // use sync overload only
    verify: jest.fn((token) => JSON.parse(token)),
};
