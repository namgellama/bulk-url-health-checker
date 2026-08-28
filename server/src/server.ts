import app from "./app";

const start = async () => {
    try {
        const PORT = 8000;

        await app.listen({ port: PORT });
        console.log(`Server running on port ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
