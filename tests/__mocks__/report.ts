const DEBUG = false;

const mockReport = {
    info: (details) => (DEBUG ? console.log('info', details) : undefined),
    noteworthy: (details) => (DEBUG ? console.log('noteworthy', details) : undefined),
    warning: (details) => (DEBUG ? console.log('warning', details) : undefined),
    error: (details) => (DEBUG ? console.log('error', details) : undefined),
    fault: (details) => (DEBUG ? console.log('fault', details) : undefined),
};

export const isConnected = true;
export const initLogDatabase = jest.fn(() => Promise.resolve({ config: {} }));
export default mockReport;
