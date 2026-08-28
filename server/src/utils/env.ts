import "dotenv/config";

class Env {
    static PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
    static DATABASE_URL = process.env.DATABASE_URL || "";
    static REDIS_URL = process.env.REDIS_URL || "";
}

export default Env;
