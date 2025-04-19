import {
  ChatInputCommandInteraction,
  Client,
  type PermissionResolvable,
  type ApplicationCommandOptionData,
} from "discord.js";

export interface CommandOptions {
  name: string;
  description: string;
  options?: ApplicationCommandOptionData[];
  permissions?: PermissionResolvable[];
}

export abstract class Command {
  client: Client;
  name: string;
  description: string;
  options: ApplicationCommandOptionData[];
  permissions: PermissionResolvable[];

  constructor(client: Client, options: CommandOptions) {
    this.client = client;
    this.name = options.name;
    this.description = options.description;
    this.options = options.options || [];
    this.permissions = options.permissions || [];
  }

  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
