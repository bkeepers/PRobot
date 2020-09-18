const createChannel = jest.fn().mockResolvedValue("mocked proxy URL");
const updateDotenv = jest.fn().mockResolvedValue({});
jest.mock("smee-client", () => ({ createChannel }));
jest.mock("update-dotenv", () => updateDotenv);

import nock from "nock";
import { Stream } from "stream";
import request from "supertest";
import pino from "pino";
import { Probot } from "../../src";
import { setupAppFactory } from "../../src/apps/setup";

describe("Setup app", () => {
  let probot: Probot;
  let logOutput: any[] = [];

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (msg, _encoding, done) => {
    logOutput.push(JSON.parse(msg));
    done();
  };

  beforeEach(async () => {
    delete process.env.WEBHOOK_PROXY_URL;
    probot = new Probot({
      log: pino(streamLogsToOutput),
    });
    probot.load(setupAppFactory(undefined));

    // there is currently no way to await probot.load, so we do hacky hack hack
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("logs", () => {
    it("should log welcome message", () => {
      const expMsgs = [
        "",
        "Welcome to Probot!",
        "Probot is in setup mode, webhooks cannot be received and",
        "custom routes will not work until APP_ID and PRIVATE_KEY",
        "are configured in .env.",
        "Please follow the instructions at http://localhost:3000 to configure .env.",
        "Once you are done, restart the server.",
        "",
      ];

      const infoLogs = logOutput
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);

      expect(infoLogs).toEqual(expect.arrayContaining(expMsgs));
    });

    it("should log welcome message with custom port", async () => {
      logOutput.length = 0; // clear array
      probot.load(setupAppFactory(8080));

      // there is currently no way to await probot.load, so we do hacky hack hack
      await new Promise((resolve) => setTimeout(resolve, 100));

      const expMsg =
        "Please follow the instructions at http://localhost:8080 to configure .env.";

      const infoLogs = logOutput
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);
      expect(infoLogs).toContain(expMsg);
    });
  });

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      await request(probot.server).get("/probot").expect(200);
    });
  });

  describe("GET /probot/setup", () => {
    it("returns a redirect", async () => {
      nock("https://api.github.com")
        .post("/app-manifests/123/conversions")
        .reply(201, {
          html_url: "/apps/my-app",
          id: "id",
          pem: "pem",
          webhook_secret: "webhook_secret",
        });

      await request(probot.server)
        .get("/probot/setup")
        .query({ code: "123" })
        .expect(302)
        .expect("Location", "/apps/my-app/installations/new");

      expect(createChannel).toHaveBeenCalledTimes(1);
      expect(updateDotenv.mock.calls).toMatchSnapshot();
    });
  });

  describe("GET /probot/import", () => {
    it("renders import.hbs", async () => {
      await request(probot.server).get("/probot/import").expect(200);
    });
  });

  describe("POST /probot/import", () => {
    it("updates .env", async () => {
      const body = JSON.stringify({
        appId: "foo",
        pem: "bar",
        webhook_secret: "baz",
      });

      await request(probot.server)
        .post("/probot/import")
        .set("content-type", "application/json")
        .send(body)
        .expect(200)
        .expect("");

      expect(updateDotenv.mock.calls).toMatchSnapshot();
    });

    it("400 when keys are missing", async () => {
      const body = JSON.stringify({
        appId: "foo",
        /* no pem */
        webhook_secret: "baz",
      });

      await request(probot.server)
        .post("/probot/import")
        .set("content-type", "application/json")
        .send(body)
        .expect(400);
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      await request(probot.server).get("/probot/success").expect(200);

      expect(createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
