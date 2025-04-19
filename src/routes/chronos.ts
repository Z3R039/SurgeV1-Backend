import axios from "axios";
import {
  app,
  config,
  launcherUpdatesService,
  logger,
  profilesService,
  seasonStatsService,
  serversService,
  userService,
} from "..";
import errors from "../utilities/errors";
import jwt, { decode, type JwtPayload } from "jsonwebtoken";
import { Encryption } from "../utilities/encryption";
import { XmppService } from "../sockets/xmpp/saved/XmppServices";
import path from "node:path";
import rotate from "../shop/rotate/rotate";
import ProfileHelper from "../utilities/ProfileHelper";

enum ARoles {
  None = "None",
  Members = "Members",
  Trusted = "Trusted",
  Donator = "Donator",
  ContentCreator = "Content Creator",
  SocialMediaManager = "Social Media Manager",
  Moderator = "Moderator",
  Admin = "Admin",
  ServerManager = "Server Manager",
  Contributor = "Contributor",
  LauncherDeveloper = "Developer",
  BackendDeveloper = "Developer",
  GameserverDeveloper = "Developer",
  CoOwner = "Co Owner",
  Owner = "Owner",
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
}

interface TokenPayload {
  accountId: string;
  username: string;
  avatar: string;
  roles: string;
  userId: string;
  email: string;
  password: string;
  profile: ProfileData;
}

interface ProfileData {
  athena: AthenaProfile;
  common_core: CommonCoreProfile;
  stats: GlobalStats;
}

interface AthenaProfile {
  currentCharacter: string;
  seasonLevel: number;
  seasonXp: number;
  bookPurchased: boolean;
  bookLevel: number;
  bookXp: number;
}

interface GlobalStats {
  wins: number;
  kills: number;
}

interface CommonCoreProfile {
  vbucks: number;
}

interface LauncherNews {
  date: string;
  title: string;
  description: string;
  image: string;
}

export default function () {
  app.get("/chronos/discord", async (c) => {
    const code = c.req.query("code");
    const timestamp = new Date().toISOString();

    if (!code)
      return c.body(
        `https://discord.com/oauth2/authorize?client_id=${
          config.discord_client_id
        }&response_type=code&redirect_uri=${encodeURIComponent(
          `http://localhost:${config.port}/chronos/discord`,
        )}&scope=identify`,
      );

    const params = new URLSearchParams();
    params.append("client_id", config.discord_client_id);
    params.append("client_secret", config.discord_client_secret);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", `http://localhost:${config.port}/chronos/discord`);
    params.append("scope", "identify");

    try {
      const tokenResponse = await axios.post("https://discord.com/api/v10/oauth2/token", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (tokenResponse.status !== 200) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find Discord user.", timestamp),
          400,
        );
      }

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get<DiscordUser>("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userResponse.status !== 200) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to get Discord user information.", timestamp),
          400,
        );
      }

      const userData = userResponse.data;

      const user = await userService.findUserByDiscordId(userData.id);

      if (!user) {
        logger.error(`Failed to find user`);
        return c.json(errors.createError(400, c.req.url, "Failed to find user.", timestamp), 400);
      }

      const profile = await profilesService.findByAccountId(user.accountId);
      if (!profile) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find profile.", timestamp),
          400,
        );
      }

      let currentRole: string = "";
      for (const role of user.roles) {
        switch (role) {
          case ARoles.Members:
          case ARoles.Trusted:
          case ARoles.Donator:
          case ARoles.ContentCreator:
          case ARoles.SocialMediaManager:
          case ARoles.Moderator:
          case ARoles.Admin:
          case ARoles.ServerManager:
          case ARoles.Contributor:
          case ARoles.LauncherDeveloper:
          case ARoles.BackendDeveloper:
          case ARoles.GameserverDeveloper:
          case ARoles.CoOwner:
          case ARoles.Owner:
            currentRole = role;
            break;
          default:
            break;
        }
      }

      const { athena, common_core } = profile;

      let favorite_character = ProfileHelper.getItemByKey(
        athena,
        athena.stats.attributes.favorite_character!,
      ).templateId.replace("AthenaCharacter:", "");

      if (!favorite_character) {
        return c.json(errors.createError(400, c.req.url, "Failed to find skin.", timestamp), 400);
      }

      const currentSkin = await axios
        .get(`https://fortnite-api.com/v2/cosmetics/br/${favorite_character}`)
        .then((res) => res.data.data);

      if (!currentSkin) {
        return c.json(errors.createError(400, c.req.url, "Failed to find skin.", timestamp), 400);
      }

      const ProfileAthena = {
        currentCharacter:
          currentSkin.images.icon ??
          "https://fortnite-api.com/images/cosmetics/br/cid_001_athena_commando_f_default/icon.png",
        seasonLevel: athena.stats.attributes.level ?? 1,
        seasonXp: athena.stats.attributes.xp ?? 0,
        bookPurchased: athena.stats.attributes.book_purchased ?? false,
        bookLevel: athena.stats.attributes.book_level ?? 0,
        bookXp: athena.stats.attributes.book_xp ?? 0,
      };

      const seasonStats = await seasonStatsService.findByAccountId(user.accountId);
      if (!seasonStats) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find season stats.", timestamp),
          400,
        );
      }

      const solo = seasonStats.solos ?? 0;
      const duo = seasonStats.duos ?? 0;
      const squad = seasonStats.squads ?? 0;
      const ltm = seasonStats.ltm ?? 0;

      const combinedWins = solo.wins + duo.wins + squad.wins + ltm.wins;
      const combinedKills = solo.kills + duo.kills + squad.kills + ltm.kills;

      const GlobalStats = {
        wins: combinedWins,
        kills: combinedKills,
      };

      const ProfileCommonCore = {
        vbucks: common_core.items["Currency:MtxPurchased"].quantity ?? 0,
      };

      const newToken = Encryption.encrypt(
        JSON.stringify({
          username: user.username,
          accountId: user.accountId,
          avatar: userData.avatar,
          roles: currentRole,
          email: user.email,
          password: user.password,
          userId: userData.id,
          profile: {
            athena: ProfileAthena,
            common_core: ProfileCommonCore,
            stats: GlobalStats,
          },
        }),
        config.client_secret,
      );

      return c.redirect(`orion://auth:${newToken}`);
    } catch (error) {
      logger.error(`Failed to get discord user: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
    }
  });

  app.post("/chronos/getPlayerData", async (c) => {
    const { token } = await c.req.json();
    const timestamp = new Date().toISOString();

    if (!token) {
      return c.json(
        errors.createError(400, c.req.url, "Missing body parameter 'token'", timestamp),
        400,
      );
    }

    try {
      const decodedToken = Encryption.decrypt(token, config.client_secret);

      if (!decodedToken) {
        return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);
      }

      let payload: TokenPayload;
      try {
        payload = JSON.parse(decodedToken);
      } catch (error) {
        return c.json(errors.createError(400, c.req.url, "Invalid Payload.", timestamp), 400);
      }

      return c.json({
        accountId: payload.accountId,
        username: payload.username,
        email: payload.email,
        password: payload.password,
        discordId: payload.userId,
        avatar: `https://cdn.discordapp.com/avatars/${payload.userId}/${payload.avatar}.png`,
        roles: payload.roles,
        profile: payload.profile,
      });
    } catch (error) {
      logger.error(`Failed to verify token: ${error}`);

      return c.json(errors.createError(400, c.req.url, "Invalid token.", timestamp), 400);
    }
  });

  app.get("/chronos/getroles/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();

    if (!accountId) {
      return c.json(
        errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
        400,
      );
    }

    try {
      const user = await userService.findUserByAccountId(accountId);
      if (!user) {
        return c.json(
          errors.createError(
            404,
            c.req.url,
            `User with the accountId '${accountId}' does not exist.`,
            timestamp,
          ),
          404,
        );
      }

      const roles = user.roles as (keyof typeof ARoles)[];

      const filteredRoles = roles.filter((role) => role !== null && role !== undefined);
      const roleNames = filteredRoles.map((role) => ARoles[role]);
      const filteredRoleNames = roleNames.filter((roleName) => roleName !== null);

      return c.json(filteredRoleNames);
    } catch (error) {
      logger.error(`Failed to get user roles: ${error}`);
      return c.json(errors.createError(400, c.req.url, "Invalid user.", timestamp), 400);
    }
  });

  app.get("/chronos/server/data/:type", async (c) => {
    const type = c.req.param("type");

    switch (type) {
      case "parties":
        return c.json(XmppService.parties);
      case "pings":
        return c.json(XmppService.pings);
      case "clients":
        return c.json(XmppService.clients);
      case "mucs":
        return c.json(XmppService.xmppMucs);
      case "servers":
        return c.json(await serversService.getAllServers());
    }
  });

  app.post("/chronos/interval/getNewProfileData", async (c) => {
    const { accountId } = await c.req.json();
    const timestamp = new Date().toISOString();

    if (!accountId) {
      console.log("Missing body parameter 'accountId'");
      return c.json(
        errors.createError(400, c.req.url, "Missing body parameter 'accountId'", timestamp),
        400,
      );
    }

    const profile = await profilesService.findByAccountId(accountId);
    if (!profile) {
      console.log("Failed to find profile.");
      return c.json(errors.createError(400, c.req.url, "Failed to find profile.", timestamp), 400);
    }

    try {
      const { athena, common_core } = profile;

      let favorite_character = ProfileHelper.getItemByKey(
        athena,
        athena.stats.attributes.favorite_character!,
      ).templateId.replace("AthenaCharacter:", "");

      if (!favorite_character) {
        return c.json(errors.createError(400, c.req.url, "Failed to find skin.", timestamp), 400);
      }

      const currentSkin = await axios
        .get(`https://fortnite-api.com/v2/cosmetics/br/${favorite_character}`)
        .then((res) => res.data.data);

      if (!currentSkin) {
        return c.json(errors.createError(400, c.req.url, "Failed to find skin.", timestamp), 400);
      }

      const ProfileAthena = {
        currentCharacter:
          currentSkin.images.icon ??
          "https://fortnite-api.com/images/cosmetics/br/cid_001_athena_commando_f_default/icon.png",
        seasonLevel: athena.stats.attributes.level ?? 1,
        seasonXp: athena.stats.attributes.xp ?? 0,
        bookPurchased: athena.stats.attributes.book_purchased ?? false,
        bookLevel: athena.stats.attributes.book_level ?? 0,
        bookXp: athena.stats.attributes.book_xp ?? 0,
      };

      const seasonStats = await seasonStatsService.findByAccountId(accountId);
      if (!seasonStats) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find season stats.", timestamp),
          400,
        );
      }

      const solo = seasonStats.solos ?? 0;
      const duo = seasonStats.duos ?? 0;
      const squad = seasonStats.squads ?? 0;
      const ltm = seasonStats.ltm ?? 0;

      const combinedWins = solo.wins + duo.wins + squad.wins + ltm.wins;
      const combinedKills = solo.kills + duo.kills + squad.kills + ltm.kills;

      const GlobalStats = {
        wins: combinedWins,
        kills: combinedKills,
      };

      const ProfileCommonCore = {
        vbucks: common_core.items["Currency:MtxPurchased"].quantity ?? 0,
      };

      return c.json({
        profile: {
          athena: ProfileAthena,
          common_core: ProfileCommonCore,
          stats: GlobalStats,
        },
      });
    } catch (error) {
      logger.error(`Failed to get new profile data: ${error}`);

      return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
    }
  });

  app.get("/chronos/launcher/news", async (c) => {
    const news = (await Bun.file(
      path.join(__dirname, "..", "..", "static", "LauncherNews.json"),
    ).json()) as LauncherNews[];

    const timestamp = new Date().toISOString();

    if (!news) {
      return c.json(errors.createError(400, c.req.url, "Failed to parse file.", timestamp), 400);
    }

    try {
      return c.json(news);
    } catch (error) {
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
    }
  });

  app.post("/chronos/launcher/updates", async (c) => {
    const { date, previousVersion, version, whatsNewText, changelog } = await c.req.json();
    const timestamp = new Date().toISOString();

    if (!date || !previousVersion || !version || !whatsNewText || !changelog) {
      return c.json(
        errors.createError(400, c.req.url, "Missing body parameter 'date'", timestamp),
        400,
      );
    }

    try {
      const launcherUpdate = await launcherUpdatesService.create({
        date,
        previousVersion,
        version,
        whatsNewText,
        changelog,
      });
      if (!launcherUpdate) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to create launcher update.", timestamp),
          400,
        );
      }

      return c.json(launcherUpdate);
    } catch (error) {
      logger.error(`Failed to create launcher update: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
    }
  });

  app.get("/size", async (c) => {
    try {
      const url = c.req.query("url");

      const response = await axios.head(url!);
      return c.json({
        size: response.headers["content-length"],
      });
    } catch (error) {
      logger.error(`Failed to get size of file: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", ""), 500);
    }
  });

  app.get("/chronos/launcher/updates/latest", async (c) => {
    try {
      const latestLauncherUpdate = await launcherUpdatesService.findNewestVersion();

      if (!latestLauncherUpdate) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find the latest launcher update.", ""),
          400,
        );
      }

      return c.json(latestLauncherUpdate);
    } catch (error) {
      logger.error(`Failed to retrieve the latest launcher update: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", ""), 500);
    }
  });

  app.get("/chronos/launcher/updates", async (c) => {
    const launcherUpdates = await launcherUpdatesService.findAll();
    if (!launcherUpdates) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to find all launcher updates.", ""),
        400,
      );
    }

    return c.json(launcherUpdates);
  });

  app.get("/chronos/forcerotate", async (c) => {
    const ro = await rotate();
    const timestamp = new Date().toISOString();

    if (!ro) {
      return c.json(errors.createError(400, c.req.url, "Failed to rotate.", timestamp), 400);
    }

    return c.json({ success: "worked" });
  });
}
