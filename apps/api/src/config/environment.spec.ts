import { validateEnvironment } from "./environment";

describe("validateEnvironment", () => {
  const validEnvironment = {
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://continuum:password@localhost:5432/continuum",
    JWT_SECRET: "a-development-secret-with-32-characters",
    REDIS_URL: "redis://:password@localhost:6379",
  };

  it("applies safe runtime defaults", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      JWT_EXPIRES_IN_SECONDS: 3600,
      NODE_ENV: "development",
      PORT: 3001,
    });
  });

  it("fails fast when a signing secret is too short", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_SECRET: "short" }),
    ).toThrow("Invalid environment configuration");
  });
});
