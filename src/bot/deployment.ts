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
            // Use dynamic import with a timeout to avoid circular dependency issues
            const CommandModule = await Promise.resolve().then(() => import(fullPath));
            const CommandClass = CommandModule.default;
            
            if (!CommandClass) {
              logger.error(`Command ${file} has no default export`);
              return undefined;
            }
            
            const commandInstance = new CommandClass(null);
            
            // Handle both Command and BaseCommand implementations
            const name = commandInstance.name || (commandInstance.data && commandInstance.data.name);
            const description = commandInstance.description || (commandInstance.data && commandInstance.data.description);
            const options = commandInstance.options || (commandInstance.data && commandInstance.data.options) || [];
            
            if (!name || !description) {
              logger.error(`Command ${file} is missing required name or description fields`);
              return undefined;
            }
            
            return {
              name,
              description,
              options,
              filePath: fullPath, // Store file path for debugging
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
    const allCommandData = await loadCommandsFromDirectory(commandsDir);
    
    // Check for duplicate command names
    const commandNames = new Map<string, string>();
    const filteredCommandData = [];
    
    for (const cmd of allCommandData) {
      if (!cmd) continue;
      
      if (commandNames.has(cmd.name)) {
        logger.error(`Duplicate command name detected: ${cmd.name}`);
        logger.error(`  First defined in: ${commandNames.get(cmd.name)}`);
        logger.error(`  Duplicate found in: ${cmd.filePath}`);
        continue; // Skip duplicate commands
      }
      
      // Store command name and its file path
      commandNames.set(cmd.name, cmd.filePath);
      
      // Remove filePath before sending to Discord API
      const { filePath, ...cmdData } = cmd;
      filteredCommandData.push(cmdData);
    }

    const rest = new REST({ version: "10" }).setToken(config.bot_token);

    logger.info("Started refreshing application (/) commands.");
    logger.info(`Registering ${filteredCommandData.length} commands`);

    const currentUser = (await rest.get(Routes.user())) as APIUser;
    const endpoint = Routes.applicationGuildCommands(currentUser.id, config.guild_id);
    await rest.put(endpoint, { body: filteredCommandData });

    logger.info("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(`Error refreshing commands: ${error}`);
  }
};


main();
