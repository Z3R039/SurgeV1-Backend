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

export default class RegisterCommand extends Command {
  constructor(client: Client) {
    super(client, {
      name: "register",
      description: "Register a new account.",
      options: [
        {
          name: "email",
          type: ApplicationCommandOptionType.String,
          description: "The email for your account.",
          required: true,
        },
        {
          name: "password",
          type: ApplicationCommandOptionType.String,
          description: "The password for your account",
          required: true,
        },
      ],
      permissions: [],
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const email = interaction.options.getString("email");
    const password = interaction.options.getString("password");
    const username = interaction.user.username;

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    const iconURL = interaction.user.avatarURL();

    if (!email || !password) {
      await interaction.editReply({
        content: "You must provide an email and password.",
      });
      return;
    }

    if (!emailRegex.test(email)) {
      const emebed = new EmbedBuilder()
        .setTitle("Invalid email")
        .setDescription("The email you provided is invalid.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const discordId = interaction.user.id;

    const user = await userService.findUserByDiscordId(discordId);
    const account = await accountService.findUserByDiscordId(discordId);

    if (user || account) {
      const emebed = new EmbedBuilder()
        .setTitle("Account already exists")
        .setDescription("An account already exists for this user.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }

    const hashedPassword = await Bun.password.hash(password);
    const accountId = uuid().replace(/-/g, "");

    const roles = interaction.member?.roles as GuildMemberRoleManager;
    const userRoles = roles.cache.map((role) => role.name);

    try {
      await userService
        .create({
          email: email as string,
          username: interaction.user.username as string,
          password: hashedPassword,
          accountId,
          discordId,
          roles: userRoles,
          banned: false,
          has_all_items: false,
          lastLogin: "",
        })
        .then(async (newUser) => {
          if (!newUser) return;

          const promises = [
            ProfileHelper.createProfile(newUser, "athena"),
            ProfileHelper.createProfile(newUser, "common_core"),
            ProfileHelper.createProfile(newUser, "campaign"),
            ProfileHelper.createProfile(newUser, "metadata"),
            ProfileHelper.createProfile(newUser, "theater0"),
            ProfileHelper.createProfile(newUser, "collection_book_people0"),
            ProfileHelper.createProfile(newUser, "collection_book_schematics0"),
            ProfileHelper.createProfile(newUser, "outpost0"),
            ProfileHelper.createProfile(newUser, "creative"),
          ];

          const [
            athena,
            common_core,
            campaign,
            metadata,
            theater0,
            collection_book_people0,
            collection_book_schematics0,
            outpost0,
            creative,
          ] = await Promise.all(promises);

          await accountService.create({
            accountId: newUser?.accountId,

            discordId,

            arenaHype: 0,
          });

          await profilesService.createOrUpdate(newUser?.accountId, "athena", athena);
          await profilesService.createOrUpdate(newUser?.accountId, "common_core", common_core);
          await profilesService.createOrUpdate(newUser?.accountId, "common_public", common_core);
          await profilesService.createOrUpdate(newUser?.accountId, "campaign", campaign);
          await profilesService.createOrUpdate(newUser?.accountId, "metadata", metadata);
          await profilesService.createOrUpdate(newUser?.accountId, "theater0", theater0);
          await profilesService.createOrUpdate(newUser?.accountId, "outpost0", outpost0);
          await profilesService.createOrUpdate(newUser?.accountId, "creative", creative);

          await profilesService.createOrUpdate(
            newUser?.accountId,
            "collection_book_people0",
            collection_book_people0,
          );
          await profilesService.createOrUpdate(
            newUser?.accountId,
            "collection_book_schematics0",
            collection_book_schematics0,
          );

          await friendsService.create({
            accountId: newUser.accountId,
          });

          await receiptsService.create(newUser.accountId, []);
          new PermissionInfo(newUser.accountId);

          const statsTemplate = ProfileHelper.createStatsTemplate();

          await seasonStatsService.create({
            solos: statsTemplate.solos,
            duos: statsTemplate.duos,
            squads: statsTemplate.squads,
            ltm: statsTemplate.ltm,
            accountId: newUser.accountId,
          });
        });

      const emebd = new EmbedBuilder()
        .setTitle("Successfully registered account")
        .setDescription("Your account has been successfully registered.")
        .setColor("Green")
        .setTimestamp()
        .setAuthor({ name: username, iconURL: iconURL! })
        .setFields([
          {
            name: "Username",
            value: username,
            inline: true,
          },
          {
            name: "Email",
            value: email,
            inline: true,
          },
        ]);

      await interaction.editReply({ embeds: [emebd] });
    } catch (error) {
      logger.error(`Error registering account: ${error}`);
      const emebed = new EmbedBuilder()
        .setTitle("Error registering account")
        .setDescription("There was an error registering your account.")
        .setColor("Red")
        .setTimestamp()
        .setAuthor({ name: username, iconURL: iconURL! });

      await interaction.editReply({ embeds: [emebed] });
      return;
    }
  }
}
