import { ExtendedClient } from "../types/ExtendedClient";
import { Command } from "./Command";
import { ChatInputCommandInteraction } from "discord.js";
import fs from "fs";
import path from "path";
import { logger } from "../..";

const loadCommandsFromDirectory = async (dir: string, client: ExtendedClient): Promise<void> => {
  const files = fs.readdirSync(dir);

  try {
    for (const file of files) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        await loadCommandsFromDirectory(fullPath, client);
      } else if (file.endsWith(".ts") || file.endsWith(".js")) {
        try {
          const CommandModule = await import(fullPath);
          const CommandClass = CommandModule.default;
          const commandInstance = new CommandClass(client);
          
          // Handle both Command and BaseCommand implementations
          const commandName = commandInstance.name || (commandInstance.data && commandInstance.data.name);
          
          if (!commandName) {
            logger.error(`Command in ${file} is missing a name property`);
            continue;
          }
          
          client.commands.set(commandName, commandInstance);
        } catch (importError) {
          logger.error(`Error importing command ${file}: ${importError}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error loading commands: ${error}`);
  }
};

export const loadCommands = async (client: ExtendedClient): Promise<void> => {
  const commandsDir = path.join(__dirname, "../commands");

  await loadCommandsFromDirectory(commandsDir, client);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      logger.error(`Error executing command: ${interaction.commandName} - ${error}`);
      await interaction.reply({
        content: "There was an error executing this command.",
        ephemeral: true,
      });
    }
  });
};
