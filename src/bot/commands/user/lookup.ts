import { Command } from "../../handlers/Command";
import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
} from "discord.js";
import { v4 as uuid } from "uuid";
import { accountService, config, logger, userService } from "../../..";

export default class LookupCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "lookup",
      description: "Lookup a user's account.",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user to lookup.",
          required: true,
        },
      ],
      permissions: [],
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const discordUser = interaction.options.getUser("user");
    const iconURL = interaction.user.avatarURL()!;

    if (!discordUser) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid username")
        .setDescription("The username you provided is invalid.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const user = await userService.findUserByDiscordId(discordUser.id);

    if (!user) {
      const emebed = new EmbedBuilder()
        .setTitle("User not found")
        .setDescription("The user you provided could not be found.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle(`User info for ${user.username}`)
        .setColor("Green")
        .addFields(
          {
            name: "Banned",
            value: `${user.banned}`,
            inline: true,
          },
          {
            name: "Discord",
            value: `<@${user.discordId}>`,
            inline: true,
          },
          {
            name: "Username",
            value: `${user.username}`,
            inline: true,
          },
          {
            name: "Full Locker",
            value: `${user.has_all_items}`,
            inline: true,
          },
        )
        .setTimestamp()
        .setAuthor({ name: user.username, iconURL });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error looking up user: ${error}`);
      const emebed = new EmbedBuilder()
        .setTitle("Error looking up user")
        .setDescription("There was an error looking up the user.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }
  }
}
