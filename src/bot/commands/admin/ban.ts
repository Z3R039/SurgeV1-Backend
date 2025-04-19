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

export default class BanCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "ban",
      description: "Bans a user.",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user you want to ban.",
          required: true,
        },
        {
          name: "reason",
          type: ApplicationCommandOptionType.String,
          description: "The reason you want to ban the user for.",
          choices: [
            {
              name: "Exploiting",
              value: "Exploiting",
            },
            {
              name: "Teaming",
              value: "Teaming",
            },
          ],
          required: true,
        },
        {
          name: "duration",
          description: "The duration you want to ban the user for.",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "24 Hours",
              value: "1",
            },
            {
              name: "3 Days",
              value: "3",
            },
            {
              name: "7 Days",
              value: "7",
            },
            {
              name: "14 Days",
              value: "14",
            },
            {
              name: "30 Days",
              value: "30",
            },
            {
              name: "90 Days",
              value: "90",
            },
            {
              name: "Permanent",
              value: "91",
            },
          ],
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
    const reason = interaction.options.getString("reason");
    const duration = interaction.options.getString("duration");

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

    if (user.banned) {
      const emebed = new EmbedBuilder()
        .setTitle("User already banned")
        .setDescription("The user you provided is already banned.")
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

    if (!reason) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid reason")
        .setDescription("Invalid reason provided.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    if (!duration) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid duration")
        .setDescription("Invalid duration provided.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const durationNum = parseInt(duration);

    if (isNaN(durationNum)) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid duration")
        .setDescription("Invalid duration provided.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: interaction.user.username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    common_core.stats.attributes.ban_status!.banReasons.push(reason);
    common_core.stats.attributes.ban_status!.bRequiresUserAck = true;
    common_core.stats.attributes.ban_status!.bBanHasStarted = true;

    const durationMap: { [key: string]: number } = {
      "1": 1.0,
      "3": 3.0,
      "7": 7.0,
      "14": 14.0,
      "30": 30.0,
      "90": 90.0,
    };

    try {
      const selectedDuration: string = duration;
      if (durationMap.hasOwnProperty(selectedDuration))
        common_core.stats.attributes.ban_status!.banDurationDays = durationMap[selectedDuration];
      else if (duration === "91") {
        await User.createQueryBuilder()
          .update(User)
          .set({ banned: true })
          .where("accountId = :accountId", { accountId: user.accountId })
          .execute();
      }

      common_core.stats.attributes.ban_history!.banCount![reason] = 1;

      await profilesService.createOrUpdate(user.accountId, "common_core", common_core);

      const embed = new EmbedBuilder()
        .setTitle("User Successfully Banned")
        .setDescription(`Successfully banned user with the username ${user.username}.`)
        .setColor("Blurple")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
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
