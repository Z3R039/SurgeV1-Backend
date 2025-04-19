import { Hono } from "hono";
import Config from "./wrappers/Env.wrapper";
import Logger, { LogLevel } from "./utilities/logging";
import Database from "./wrappers/Database.wrapper";
import UserService from "./wrappers/database/UserService";
import { loadRoutes } from "./utilities/routing";
import path from "node:path";
import AccountService from "./wrappers/database/AccountService";
import TokensService from "./wrappers/database/TokensService";
import ProfilesService from "./wrappers/database/ProfilesService";
import HypeService from "./wrappers/database/HypeService";
import FriendsService from "./wrappers/database/FriendsService";
import { ItemStorageService } from "./wrappers/database/ItemStorageService";
import { DiscordWebhook } from "./utilities/webhook";
import type { User } from "./tables/user";
import type { Account } from "./tables/account";
import { QuestManager, QuestType } from "./utilities/managers/QuestManager";
import { cors } from "hono/cors";
import type PermissionInfo from "./utilities/permissions/permissioninfo";
import errors from "./utilities/errors";
import { logger as httplogging } from "hono/logger";
import { QuestsService } from "./wrappers/database/QuestsService";
import ServersService from "./wrappers/database/ServersService";
import SessionsService from "./wrappers/database/SessionsService";
import ReceiptsService from "./wrappers/database/ReceiptsService";
import { CampaignQuestManager } from "./utilities/managers/CampaignQuestManager";
import SeasonStatsService from "./wrappers/database/SeasonStatsService";
import DisplayAssetsService from "./wrappers/database/DisplayAssetsService";
import insertDisplayAssets from "./utilities/inserts/insertDisplayAssets";
import QuestRewardsService from "./wrappers/database/QuestRewardsService";
import insertQuestRewards from "./utilities/inserts/insertQuestRewards";
import fs from "node:fs/promises";
import LauncherUpdatesService from "./wrappers/database/LauncherUpdatesService";
import { ContentPageService } from "./wrappers/database/ContentPageService";

export type Variables = {
  user: User;
  account: Account;
  permission: PermissionInfo;
};

export const app = new Hono<{ Variables: Variables }>({ strict: false });
export const logger = new Logger(LogLevel.DEBUG);
export const config = new Config().getConfig();

app.use("*", cors());
app.use(httplogging());

app.notFound((c) =>
  c.json(
    errors.createError(
      404,
      c.req.url,
      "The specified route was not found.",
      new Date().toISOString(),
    ),
    404,
  ),
);

export const db = new Database({
  connectionString: config.databaseUrl,
});

await db.connect();

export const userService = new UserService(db);
export const accountService = new AccountService(db);
export const tokensService = new TokensService(db);
export const profilesService = new ProfilesService(db);
export const hypeService = new HypeService(db);
export const friendsService = new FriendsService(db);
export const itemStorageService = new ItemStorageService(db);
export const questsService = new QuestsService(db);
export const serversService = new ServersService(db);
export const sessionsService = new SessionsService(db);
export const receiptsService = new ReceiptsService(db);
export const seasonStatsService = new SeasonStatsService(db);
export const displayAssetsService = new DisplayAssetsService(db);
export const questRewardsService = new QuestRewardsService(db);
export const launcherUpdatesService = new LauncherUpdatesService(db);
export const contentPageService = new ContentPageService(db);

await loadRoutes(path.join(__dirname, "routes"), app);

import("./bot/deployment");
import("./bot/bot");

if (config.tcp) import("./sockets/xmpp/tcp/server");
import("./sockets/xmpp/server");
import("./sockets/matchmaker/server");
import("./sockets/sessionsmatchmaker/server");

import("./shop/rotate/autorotate");

await QuestManager.initQuests();
await CampaignQuestManager.initQuests();

await insertDisplayAssets();
await insertQuestRewards();

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

logger.startup(`Lynt is running on port ${config.port}`);

DiscordWebhook.SendBackendRestartWebhook();
