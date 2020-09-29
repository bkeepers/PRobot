import Stream from "stream";

import { Webhooks } from "@octokit/webhooks";
import pino from "pino";

import { Application, createProbot, Probot, ProbotOctokit } from "../src";

describe("Deprecations", () => {
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];
  });

  it("createProbot", () => {
    const probot = createProbot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
    );
  });

  it("probot.webhook", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(probot.webhook).toBeInstanceOf(Webhooks);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "probot.webhook" is deprecated. Use "probot.webhooks" instead`
    );
  });

  it("new Probot({ cert })", () => {
    new Probot({
      id: 1,
      cert: "private key",
      log: pino(streamLogsToOutput),
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "cert" option is deprecated. Use "privateKey" instead`
    );
  });

  it("probot.logger", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.logger.info("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      `[probot] "probot.logger" is deprecated. Use "probot.log" instead`
    );
  });

  it("octokit.repos.createStatus()", () => {
    const log = pino(streamLogsToOutput);
    const octokit = new ProbotOctokit({
      log: {
        error: log.error.bind(log),
        warn: log.warn.bind(log),
        info: log.info.bind(log),
        debug: log.debug.bind(log),
      },
    });

    octokit.hook.wrap("request", () => {});

    try {
      octokit.repos.createStatus();
    } catch (error) {
      console.log(error);
    }

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `octokit.repos.createStatus() has been renamed to octokit.repos.createCommitStatus()`
    );
  });

  it("throttleOptions", async () => {
    expect.assertions(4);

    const testLog = pino(streamLogsToOutput);
    const log = ({
      fatal: testLog.fatal.bind(testLog),
      error: testLog.error.bind(testLog),
      warn: testLog.warn.bind(testLog),
      info: testLog.info.bind(testLog),
      debug: testLog.debug.bind(testLog),
      trace: testLog.trace.bind(testLog),
      child: () => log,
    } as unknown) as pino.Logger;
    const Octokit = ProbotOctokit.plugin((octokit: any, options: any) => {
      return {
        pluginLoaded: true,
        test() {
          expect(options.throttle.id).toBe(1);
          expect(options.throttle.foo).toBe("bar");
        },
      };
    }).defaults({ log });

    const app = new Application({
      Octokit,
      id: 1,
      privateKey: "private key",
      secret: "secret",
      throttleOptions: {
        foo: "bar",
        onAbuseLimit: () => true,
        onRateLimit: () => true,
      },
      log,
    });

    const installationOctokit = await app.auth(1);
    installationOctokit.test();

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "new Application({ throttleOptions })" is deprecated. Use "new Application({Octokit: ProbotOctokit.defaults({ throttle }) })" instead`
    );
  });
});
