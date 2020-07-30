import report, { isConnected, Category } from './report';

const serverFault = (error: Error, critical = false) => {
    if (isConnected) {
        report.fault({
            category: Category.SYSTEM,
            description: error,
        });
    }
    console.error(error);
    if (critical) process.exit(1);
};

export default serverFault;
