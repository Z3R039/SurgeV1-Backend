import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import { accountService, config, serversService, tokensService, userService } from "../..";
import { v4 as uuid } from "uuid";

export default class GameServerCommand extends BaseCommand {
  data = {
    name: "gameserver",
    description: "Manage game server logins",
    options: [
      {
        name: "generate",
        type: ApplicationCommandOptionType.Subcommand,
        description: "Generate a custom login for a game server",
        options: [
          {
            name: "username",
            type: ApplicationCommandOptionType.String,
            description: "The username for the game server login (optional, will generate 5-char random if not provided)",
            required: false,
          },
          {
            name: "password",
            type: ApplicationCommandOptionType.String,
            description: "The password for the game server login (optional, will generate 8-char random if not provided)",
            required: false,
          },
          {
            name: "description",
            type: ApplicationCommandOptionType.String,
            description: "A description for this game server login",
            required: false,
          },
        ],
      },
      {
        name: "delete",
        type: ApplicationCommandOptionType.Subcommand,
        description: "Delete a custom game server login",
        options: [
          {
            name: "username",
            type: ApplicationCommandOptionType.String,
            description: "The username of the game server login to delete",
            required: true,
          },
        ],
      },
      {
        name: "list",
        type: ApplicationCommandOptionType.Subcommand,
        description: "List all custom game server logins",
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
    dmPermission: false,
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.memberPermissions?.has("Administrator")) {
      return await interaction.editReply({
        content: "You do not have permission to use this command.",
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "generate":
        return this.generateLogin(interaction);
      case "delete":
        return this.deleteLogin(interaction);
      case "list":
        return this.listLogins(interaction);
      default:
        return await interaction.editReply({
          content: "Invalid subcommand.",
        });
    }
  }

  private async generateLogin(interaction: CommandInteraction): Promise<any> {
    // Generate random username (5 chars) if not provided
    let username = interaction.options.get("username")?.value as string;
    if (!username) {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
      username = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
    }
    
    // Generate random password (8 chars) if not provided
    let password = interaction.options.get("password")?.value as string;
    if (!password) {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*".split("");
      password = Array(8).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
    }
    
    const description = interaction.options.get("description")?.value as string || "Custom game server login";

    // Check if username already exists
    const existingUser = await userService.findUserByUsername(username);
    if (existingUser) {
      const embed = new EmbedBuilder()
        .setTitle("Username Already Exists")
        .setDescription("This username is already in use. Please choose a different one.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    // Create a new account for the game server
    const accountId = uuid().replace(/-/gi, "");
    const hashedPassword = await Bun.password.hash(password);
    
    // Generate random string for email
    const randomChars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
    const randomString = Array(6).fill(0).map(() => randomChars[Math.floor(Math.random() * randomChars.length)]).join("");
    const serverEmail = `${randomString}@StormMP.gs`;

    try {
      // Create the user account
      const newUser = await userService.create({
        email: serverEmail,
        username: username,
        password: hashedPassword,
        accountId,
        discordId: interaction.user.id, // Link to the admin who created it
        roles: ["gameserver"],
        banned: false,
        has_all_items: false,
        lastLogin: "",
        description: description
      });

      if (!newUser) {
        throw new Error("Failed to create user account");
      }

      // Generate a permanent access token for the game server
      const accessToken = uuid().replace(/-/gi, "");
      await tokensService.create(
        {
          token: accessToken,
          type: "accesstoken",
          clientId: config.client_id,
          grant: "gameserver",
        },
        accountId
      );

      const embed = new EmbedBuilder()
        .setTitle("Game Server Login Created")
        .setDescription(
          `Successfully created a game server login with the following details:`
        )
        .addFields(
          { name: "Username", value: username, inline: true },
          { name: "Password", value: password, inline: true },
          { name: "Email", value: serverEmail, inline: true },
          { name: "Account ID", value: accountId, inline: false },
          { name: "Access Token", value: accessToken, inline: false },
          { name: "Description", value: description, inline: false }
        )
        .setColor("Green")
        .setFooter({ text: "Keep these credentials secure!" })
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Error Creating Game Server Login")
        .setDescription(`An error occurred: ${error.message}`)
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }
  }

  private async deleteLogin(interaction: CommandInteraction): Promise<any> {
    const username = interaction.options.get("username", true).value as string;

    try {
      // Find the user by username
      const user = await userService.findUserByUsername(username);
      if (!user) {
        const embed = new EmbedBuilder()
          .setTitle("User Not Found")
          .setDescription(`No game server login found with username: ${username}`)
          .setColor("Red")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Check if it's a game server account
      if (!user.roles.includes("gameserver")) {
        const embed = new EmbedBuilder()
          .setTitle("Not a Game Server Account")
          .setDescription(`The account '${username}' is not a game server account.`)
          .setColor("Red")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Delete tokens associated with the account
      await tokensService.deleteByAccountId(user.accountId);

      // Delete the user account
      await userService.deleteByAccountId(user.accountId);
      await accountService.deleteByAccountId(user.accountId);

      const embed = new EmbedBuilder()
        .setTitle("Game Server Login Deleted")
        .setDescription(`Successfully deleted the game server login: ${username}`)
        .setColor("Green")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Error Deleting Game Server Login")
        .setDescription(`An error occurred: ${error.message}`)
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }
  }

  private async listLogins(interaction: CommandInteraction): Promise<any> {
    try {
      // Find all users with the gameserver role
      const users = await userService.findAllByRole("gameserver");

      if (!users || users.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle("No Game Server Logins")
          .setDescription("There are no game server logins configured.")
          .setColor("Blue")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Create a list of game server logins
      const loginList = users.map((user, index) => {
        return `${index + 1}. **${user.username}** - ${user.description || "No description"} (ID: ${user.accountId})`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Game Server Logins")
        .setDescription("Here are all the configured game server logins:\n\n" + loginList)
        .setColor("Blue")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Error Listing Game Server Logins")
        .setDescription(`An error occurred: ${error.message}`)
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }
  }
}