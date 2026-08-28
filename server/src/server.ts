import app from "./app";
import Env from "./utils/env";

const start = async () => {
    try {
        const PORT = Env.PORT;

        await app.listen({ port: PORT });
        console.log(`Server running on port ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
