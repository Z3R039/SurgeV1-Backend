import { Command } from "../../handlers/Command";
import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import { v4 as uuid } from "uuid";
import {
  accountService,
  config,
  friendsService,
  logger,
  profilesService,
  receiptsService,
  seasonStatsService,
  userService,
} from "../../..";
import PermissionInfo from "../../../utilities/permissions/permissioninfo";
import ProfileHelper from "../../../utilities/ProfileHelper";
import type { ItemValue, Lootlist } from "../../../../types/profilesdefs";
import { handleProfileSelection } from "../../../operations/QueryProfile";
import path from "node:path";
import RefreshAccount from "../../../utilities/refresh";
import { User } from "../../../tables/user";
import { handle } from "hono/cloudflare-pages";

export default class UnbanCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "unban",
      description: "Unbans a user.",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user you want to ban.",
          required: true,
        },
      ],
      permissions: ["BanMembers"],
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const iconURL = interaction.user.avatarURL()!;

    if (!interaction.memberPermissions!.has("BanMembers")) {
      const emebed = new EmbedBuilder()
        .setTitle("Missing permissions")
        .setDescription("You do not have the required permissions to run this command.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const discordUser = interaction.options.getUser("user");

    if (!discordUser) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid user")
        .setDescription("Invalid user provided.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

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
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const account = await accountService.findUserByDiscordId(discordUser.id);

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

    const common_core = await handleProfileSelection("common_core", user.accountId);
    if (!common_core) {
      const emebed = new EmbedBuilder()
        .setTitle("Profile not found")
        .setDescription("Profile 'common_core' could not be found.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    try {
      const banStatus = common_core.stats.attributes.ban_status!;

      banStatus.bRequiresUserAck = false;
      banStatus.bBanHasStarted = false;

      if (user.banned) {
        await User.createQueryBuilder()
          .update(User)
          .set({ banned: false })
          .where("accountId = :accountId", { accountId: user.accountId })
          .execute();
      }

      const emebed = new EmbedBuilder()
        .setTitle("User Successfully Unbanned")
        .setDescription(`Successfully unbanned user with the username ${user.username}.`)
        .setColor("Green")
        .setTimestamp()
        .setAuthor({ name: user.username, iconURL: iconURL! });

      const userEmebed = new EmbedBuilder()
        .setTitle("You have been unbanned.")
        .setColor("Green")
        .setTimestamp()
        .setAuthor({ name: user.username, iconURL: iconURL! });

      await profilesService.update(user.accountId, "common_core", common_core);

      await discordUser.send({ embeds: [userEmebed] });

      await interaction.editReply({ embeds: [emebed] });
    } catch (error) {
      logger.error(`Error banning user: ${error}`);
      const emebed = new EmbedBuilder()
        .setTitle("Error banning user")
        .setDescription("There was an error banning the user.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }
  }
}
