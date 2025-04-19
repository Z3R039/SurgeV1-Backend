import { REST, Routes, type APIUser } from "discord.js";
import fs from "node:fs/promises";
import { join } from "node:path";
import { config, logger } from "..";

const loadCommandsFromDirectory = async (dir: string): Promise<any[]> => {
  const files = await fs.readdir(dir);
  const commandDataPromises: Promise<any>[] = [];

  for (const file of files) {
    const fullPath = join(dir, file);

    if ((await fs.stat(fullPath)).isDirectory()) {
      commandDataPromises.push(loadCommandsFromDirectory(fullPath));
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      commandDataPromises.push(
        (async () => {
          try {
            const CommandModule = await import(fullPath);
            const CommandClass = CommandModule.default;
            const commandInstance = new CommandClass(null);
            return {
              name: commandInstance.name,
              description: commandInstance.description,
              options: commandInstance.options,
            };
          } catch (error) {
            logger.error(`Error loading command ${file}: ${error}`);
            return undefined;
          }
        })(),
      );
    }
  }

  const commandData = await Promise.all(commandDataPromises);
  return commandData.flat().filter((cmd) => cmd !== undefined);
};

const main = async () => {
  try {
    const commandsDir = join(__dirname, "commands");
    const filteredCommandData = await loadCommandsFromDirectory(commandsDir);

    const rest = new REST({ version: "10" }).setToken(config.bot_token);

    logger.info("Started refreshing application (/) commands.");

    const currentUser = (await rest.get(Routes.user())) as APIUser;
    const endpoint = Routes.applicationGuildCommands(currentUser.id, config.guild_id);
    await rest.put(endpoint, { body: filteredCommandData });

    logger.info("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(`Error refreshing commands: ${error}`);
  }
};

main();
