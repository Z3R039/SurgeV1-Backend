import { GatewayIntentBits } from "discord.js";
import { ExtendedClient } from "./types/ExtendedClient";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { config, logger } from "..";

const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

await loadCommands(client);
loadEvents(client);

client.once("ready", () => {
  logger.startup(`Logged in as ${client.user?.tag}`);
});

client.login(config.bot_token);
