import {
  accountService,
  friendsService,
  profilesService,
  questsService,
  receiptsService,
  seasonStatsService,
  userService,
} from "../../..";
import { Command } from "../../handlers/Command";
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  ComponentType,
  EmbedBuilder,
} from "discord.js";

export default class DeleteCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "delete",
      description: "Delete your account.",
      options: [],
      permissions: [],
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const iconURL = interaction.user.avatarURL()!;

    try {
      const discordId = interaction.user.id;
      const user = await userService.findUserByDiscordId(discordId);
      const account = await accountService.findUserByDiscordId(discordId);

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

      const profile = await profilesService.findByAccountId(user.accountId);

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

      const friends = await friendsService.findFriendByAccountId(user.accountId);
      if (!friends) {
        const emebed = new EmbedBuilder()
          .setTitle("Friend not found")
          .setDescription("The friend you provided could not be found.")
          .setColor("Red")
          .setTimestamp()
          .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

        await interaction.editReply({ embeds: [emebed] });
        return;
      }

      const seasonStats = await seasonStatsService.findByAccountId(user.accountId);
      if (!seasonStats) {
        const emebed = new EmbedBuilder()
          .setTitle("Season stats not found")
          .setDescription("The season stats you provided could not be found.")
          .setColor("Red")
          .setTimestamp()
          .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

        await interaction.editReply({ embeds: [emebed] });
        return;
      }

      const confirmButton = new ButtonBuilder()
        .setCustomId("confirmDelete")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancelDelete")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      const confirmEmbed = new EmbedBuilder()
        .setTitle("Are you sure you want to delete your account?")
        .setDescription("This action cannot be undone.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      const test = await interaction.editReply({
        embeds: [confirmEmbed],
        components: [row as any],
      });

      const collector = test.createMessageComponentCollector({
        filter: (i) => i.customId === "confirmDelete" || i.customId === "cancelDelete",
        time: 15000,
      });

      collector?.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "confirmDelete") {
          const promises = [
            userService.delete(user.accountId),
            accountService.delete(user.accountId),
            profilesService.deleteByAccountId(user.accountId),
            friendsService.delete(user.accountId),
            questsService.deleteQuestsByAccountId(user.accountId),
            receiptsService.delete(user.accountId),
            seasonStatsService.delete(user.accountId),
          ];

          const [
            userDelete,
            accountDelete,
            profileDelete,
            friendDelete,
            questsDelete,
            receiptsDelete,
            statsDelete,
          ] = await Promise.all(promises);

          if (
            userDelete &&
            accountDelete &&
            profileDelete &&
            friendDelete &&
            questsDelete &&
            receiptsDelete &&
            statsDelete
          ) {
            const embed = new EmbedBuilder()
              .setTitle("Account Deleted Successfully")
              .setDescription("Your account has been successfully deleted.")
              .setColor("Blurple")
              .setTimestamp();

            await buttonInteraction.update({
              embeds: [embed],
              components: [],
            });
          }
        } else if (buttonInteraction.customId === "cancelDelete") {
          const embed = new EmbedBuilder()
            .setTitle("Cancelled Account Deletion")
            .setDescription("You have cancelled the deletion of your account.")
            .setColor("Blurple")
            .setTimestamp();

          await buttonInteraction.update({
            embeds: [embed],
            components: [],
          });
        }
      });

      collector?.on("end", () => {
        interaction.editReply({ components: [] }).catch(console.error);
      });
    } catch (error) {
      const emebed = new EmbedBuilder()
        .setTitle("Error deleting account")
        .setDescription("There was an error deleting your account.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }
  }
}
