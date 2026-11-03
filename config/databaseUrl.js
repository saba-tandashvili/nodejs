function configureDatabaseUrl() {
  if (!process.env.DATABASE_URL && process.env.DB_DATABASE) {
    const username = encodeURIComponent(process.env.DB_USER || "");
    const password = encodeURIComponent(process.env.DB_PASSWORD || "");
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const database = encodeURIComponent(process.env.DB_DATABASE);
    process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }
}

export default configureDatabaseUrl;
