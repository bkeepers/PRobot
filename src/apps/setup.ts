import bodyParser from "body-parser";
import { exec } from "child_process";
import { Request, Response } from "express";
import updateDotenv from "update-dotenv";
import { Application } from "../application";
import { ManifestCreation } from "../manifest-creation";

import { getLoggingMiddleware } from "../server/logging-middleware";

// TODO: after #1335 is merged, pass 'host' as well
export const setupAppFactory = (port: number | undefined) =>
  async function setupApp(app: Application) {
    const setup: ManifestCreation = new ManifestCreation();

    // If not on Glitch or Production, create a smee URL
    if (
      process.env.NODE_ENV !== "production" &&
      !(process.env.PROJECT_DOMAIN || process.env.WEBHOOK_PROXY_URL)
    ) {
      await setup.createWebhookChannel();
    }

    const route = app.route();

    route.use(getLoggingMiddleware(app.log));

    printWelcomeMessage(app, port);

    route.get("/probot", async (req, res) => {
      const baseUrl = getBaseUrl(req);
      const pkg = setup.pkg;
      const manifest = setup.getManifest(pkg, baseUrl);
      const createAppUrl = setup.createAppUrl;
      // Pass the manifest to be POST'd
      res.render("setup.hbs", { pkg, createAppUrl, manifest });
    });

    route.get("/probot/setup", async (req: Request, res: Response) => {
      const { code } = req.query;
      const response = await setup.createAppFromCode(code);

      restartGlitchApp(app);

      res.redirect(`${response}/installations/new`);
    });

    route.get("/probot/import", async (_req, res) => {
      const { WEBHOOK_PROXY_URL } = process.env;
      res.render("import.hbs", { WEBHOOK_PROXY_URL });
    });

    route.post("/probot/import", bodyParser.json(), async (req, res) => {
      const { appId, pem, webhook_secret } = req.body;
      if (!appId || !pem || !webhook_secret) {
        res.status(400).send("appId and/or pem and/or webhook_secret missing");
        return;
      }
      updateDotenv({
        APP_ID: appId,
        PRIVATE_KEY: `"${pem}"`,
        WEBHOOK_SECRET: webhook_secret,
      });
      res.end();
      restartGlitchApp(app);
    });

    route.get("/probot/success", async (req, res) => {
      res.render("success.hbs");
    });

    route.get("/", (req, res, next) => res.redirect("/probot"));
  };

function printWelcomeMessage(app: Application, port: number | undefined) {
  // use glitch env to get correct domain welcome message
  // https://glitch.com/help/project/
  const domain =
    process.env.PROJECT_DOMAIN || `http://localhost:${port || 3000}`;

  [
    ``,
    `Welcome to Probot!`,
    `Probot is in setup mode, webhooks cannot be received and`,
    `custom routes will not work until APP_ID and PRIVATE_KEY`,
    `are configured in .env.`,
    `Please follow the instructions at ${domain} to configure .env.`,
    `Once you are done, restart the server.`,
    ``,
  ].forEach((line) => {
    app.log.info(line);
  });
}

function getBaseUrl(req: Request): string {
  const protocols = req.headers["x-forwarded-proto"] || req.protocol;
  const protocol =
    typeof protocols === "string" ? protocols.split(",")[0] : protocols[0];
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  return baseUrl;
}

function restartGlitchApp(app: Application) {
  // If using glitch, restart the app
  if (process.env.PROJECT_DOMAIN) {
    exec("refresh", (error) => {
      if (error) {
        app.log.error(error);
      }
    });
  }
}
