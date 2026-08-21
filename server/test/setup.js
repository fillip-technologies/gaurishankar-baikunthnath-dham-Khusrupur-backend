import { beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import pino from "pino";

// --- Deterministic test environment (set BEFORE any app/config import) ---------
// dotenv (loaded inside env.config.js) does not override already-set vars, so
// these win over whatever is in a local .env.
process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
process.env.CHALLENGE_TOKEN_SECRET = "test_challenge_secret";
process.env.ACCESS_TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";
process.env.CHALLENGE_TOKEN_EXPIRES_IN = "5m";
process.env.SALT_ROUND = "10";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.MAIL_HOST = "smtp.test";
process.env.MAIL_PORT = "587";
process.env.MAIL_USER = "test";
process.env.MAIL_PASSWORD = "test";
process.env.MAIL_FROM = "noreply@test.com";
// Security thresholds — small so tests are fast and deterministic.
process.env.RATE_LIMIT_LOGIN_MAX = "5";
process.env.RATE_LIMIT_OTP_MAX = "50";
process.env.RATE_LIMIT_WINDOW_MINUTES = "15";
process.env.MAX_OTP_ATTEMPTS = "5";
// Razorpay — deterministic secrets so HMAC signature paths are reproducible.
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_test_webhook_secret";

// --- Global mocks --------------------------------------------------------------
// nodemailer: prevents transporter.verify()/sendMail from hitting the network on
// import of mail.config.js, and lets tests run without SMTP.
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      verify: (cb) => cb && cb(null, true),
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    }),
  },
}));

// logger: silence pino output during the run.
const silentLogger = pino({ level: "silent" });
vi.mock("../src/utils/logger.js", () => ({
  default: silentLogger,
}));

// --- In-memory Mongo lifecycle -------------------------------------------------
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "test" });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
