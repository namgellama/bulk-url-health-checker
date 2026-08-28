import "dotenv/config";

class Env {
    static PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
    static DATABASE_URL = process.env.DATABASE_URL || "";
}

export default Env;
