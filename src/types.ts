import { WebhookEvent, Webhooks } from "@octokit/webhooks";
import LRUCache from "lru-cache";

import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { Application } from "./application";

import type { Logger, LogFn } from "pino";

export type State = {
  id?: number;
  privateKey?: string;
  githubToken?: string;
  log: Logger;
  Octokit: typeof ProbotOctokit;
  octokit: InstanceType<typeof ProbotOctokit>;
  cache?: LRUCache<number, string>;
  webhooks: {
    path?: string;
    secret?: string;
  };
};

export type ProbotWebhooks = Webhooks<
  WebhookEvent,
  Omit<Context, keyof WebhookEvent>
>;

export type DeprecatedLogger = LogFn & Logger;

type deprecatedKeys =
  | "router"
  | "log"
  | "on"
  | "receive"
  | "load"
  | "route"
  | "auth";
export type ApplicationFunctionOptions = {
  /**
   * @deprecated "(app) => {}" is deprecated. Use "({ app }) => {}" instead.
   */
  [K in deprecatedKeys]: Application[K];
} & { app: Application };
export type ApplicationFunction = (options: ApplicationFunctionOptions) => void;
