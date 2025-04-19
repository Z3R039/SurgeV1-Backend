import { accountService, logger, seasonStatsService, userService } from "../../..";
import { handleProfileSelection } from "../../../operations/QueryProfile";
import { Command } from "../../handlers/Command";
import { ChatInputCommandInteraction, Client, EmbedBuilder } from "discord.js";

export default class AccountCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "account",
      description: "View your account information.",
      options: [],
      permissions: [],
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const iconURL = interaction.user.avatarURL()!;

    const user = await userService.findUserByDiscordId(interaction.user.id);

    if (!user) {
      const emebed = new EmbedBuilder()
        .setTitle("User not found")
        .setDescription("The user you provided could not be found.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const account = await accountService.findUserByDiscordId(interaction.user.id);
    if (!account) {
      const emebed = new EmbedBuilder()
        .setTitle("Account not found")
        .setDescription("The account you provided could not be found.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const profile = await handleProfileSelection("athena", user.accountId);
    if (!profile) {
      const emebed = new EmbedBuilder()
        .setTitle("Profile not found")
        .setDescription("The profile you provided could not be found.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    try {
      const userStats = await seasonStatsService.findByAccountId(user.accountId);
      if (!userStats) {
        const emebed = new EmbedBuilder()
          .setTitle("User stats not found")
          .setDescription("The user stats you provided could not be found.")
          .setColor("Red")
          .setTimestamp()
          .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

        await interaction.editReply({ embeds: [emebed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("Account information")
        .setDescription("Your account information.")
        .setColor("Green")
        .addFields(
          {
            name: "User Information",
            value: `Banned: ${user.banned}\nDiscord: <@${user.discordId}>\nUsername: ${user.username}\nFull Locker: ${user.has_all_items}\nAccountId: ${user.accountId}`,
            inline: true,
          },

          {
            name: "Battlepass Details",
            value: `Purchased: ${profile.stats.attributes.book_purchased}\nTier: ${profile.stats.attributes.book_level}\nLevel: ${profile.stats.attributes.level}\nBattlepass XP: ${profile.stats.attributes.book_xp}\nXP: ${profile.stats.attributes.xp}`,
            inline: true,
          },
          {
            name: "Seasonal Stats",
            value: `**Solos** - Wins: ${userStats.solos.wins}, Kills: ${userStats.solos.kills}, Matches Played: ${userStats.solos.matchesplayed}\n**Duos** - Wins: ${userStats.duos.wins}, Kills: ${userStats.duos.kills}, Matches Played: ${userStats.duos.matchesplayed}\n**Squads** - Wins: ${userStats.squads.wins}, Kills: ${userStats.squads.kills}, Matches Played: ${userStats.squads.matchesplayed}`,
            inline: true,
          },
        )
        .setTimestamp()
        .setAuthor({ name: user.username, iconURL });

      await interaction.editReply({ embeds: [embed] });
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
