import { accountService, app, friendsService, logger, seasonStatsService, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";

const controller = app.basePath("/fortnite/api");
const proxy = app.basePath("/statsproxy/api");

type PlaylistType = "solos" | "duos" | "squads" | "ltm";

// pc_m0_p10 (PC - DUOS)
// pc_m0_p2 (PC - SOLOS)
// pc_m0_p9 (PC - SQUADS)

export default function () {
  controller.get("/game/v2/leaderboards/cohort/:accountId", Validation.verifyToken, async (c) => {
    const playlist = c.req.query("playlist");
    const timestamp = new Date().toISOString();
    const accountId = c.req.param("accountId");

    if (!playlist)
      return c.json(
        errors.createError(400, c.req.url, "Query parameter 'playlist' not found.", timestamp),
        400,
      );

    const user = await userService.findUserByAccountId(accountId);
    const account = await accountService.findUserByAccountId(accountId);

    if (!user || !account)
      return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

    logger.debug(`Playlist: ${playlist}`);

    try {
      const playlists: { [key: string]: PlaylistType } = {
        pc_m0_p10: "solos",
        pc_m0_p2: "duos",
        pc_m0_p9: "squads",
      };

      const specificPlaylist = playlists[playlist];
      const stat = await seasonStatsService.findStatByAccountId(user.accountId, specificPlaylist);

      if (!stat)
        return c.json(errors.createError(404, c.req.url, "Stat not found.", timestamp), 404);

      const friends = await friendsService.findFriendByAccountId(user.accountId);

      if (!friends)
        return c.json(errors.createError(404, c.req.url, "No friends found.", timestamp), 404);

      const accountIds: string[] = [];

      for (const acceptedFriends of friends.accepted) {
        accountIds.push(acceptedFriends.accountId);
      }

      return c.json({
        accountId: user.accountId,
        cohortAccountIds: accountIds,
        expiresAt: "9999-01-01T00:00:00Z",
        playlist,
      });
    } catch (error) {
      logger.error(`Error getting leaderboard data: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
    }
  });

  proxy.get(
    "/statsv2/leaderboards/:leaderboardName",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const leaderboardName = c.req.param("leaderboardName");

      const entries: object[] = [];

      logger.debug(`leaderboardName: ${leaderboardName}`);

      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const user = await userService.findUserByAccountId(c.get("user").accountId);
      const account = await accountService.findUserByAccountId(c.get("user").accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const playlists: { [key: string]: PlaylistType } = {
          br_placetop1_keyboardmouse_m0_playlist_defaultsolo: "solos",
          br_placetop1_keyboardmouse_m0_playlist_defaultduo: "duos",
          br_placetop1_keyboardmouse_m0_playlist_defaultsquad: "squads",
        };

        const specificPlaylist = playlists[leaderboardName];
        const stat = await seasonStatsService.findStatByAccountId(user.accountId, specificPlaylist);

        if (!stat)
          return c.json(errors.createError(404, c.req.url, "Stat not found.", timestamp), 404);

        const topAccounts = await seasonStatsService.findTopAccounts(specificPlaylist, 1000);

        if (topAccounts.length === 0) {
          return c.json({
            entries: [],
            maxSize: 0,
          });
        }

        for (const topAccount of topAccounts) {
          const topAccountStats = topAccount[specificPlaylist];

          if (!topAccountStats)
            return c.json(errors.createError(404, c.req.url, "Stat not found.", timestamp), 404);

          entries.push({
            account: topAccount.accountId,
            value: topAccountStats.wins,
          });
        }

        return c.json({
          entries,
          maxSize: entries.length,
        });
      } catch (error) {
        logger.error(`Error getting leaderboard entries: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
      }
    },
  );

  /* 
  {
    "startTime": 0,
    "endTime": 9223372036854775807,
    "stats": {
      "br_score_keyboardmouse_m0_playlist_defaultsolo": 472
    },
    "accountId": "17aa73e6e694484296cf00d7f11f4acb"
  }
  */

  controller.get(
    "/statsv2/account/:accountId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const accountId = c.req.param("accountId");

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek + 1;
        endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
        endOfWeek.setHours(23, 59, 59, 999);

        const startTime = startOfDay.getTime();
        const endTime = endOfWeek.getTime();

        const userStats = await seasonStatsService.findByAccountId(user.accountId);

        if (!userStats)
          return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

        return c.json({
          startTime,
          endTime,
          stats: {
            br_score_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].wins,
            br_kills_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].kills,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsolo:
              userStats["solos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsquad:
              userStats["squads"].matchesplayed,
            br_placetop25_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top25,
            br_placetop10_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top10,
            br_placetop1_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top1,
          },
          accountId: user.accountId,
        });
      } catch (error) {
        logger.error(`Failed to get stats: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );

  proxy.get(
    "/statsv2/account/:accountId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const accountId = c.req.param("accountId");

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek + 1;
        endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
        endOfWeek.setHours(23, 59, 59, 999);

        const startTime = startOfDay.getTime();
        const endTime = endOfWeek.getTime();

        const userStats = await seasonStatsService.findByAccountId(user.accountId);

        if (!userStats)
          return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

        return c.json({
          startTime,
          endTime,
          stats: {
            br_score_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].wins,
            br_kills_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].kills,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsolo:
              userStats["solos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsquad:
              userStats["squads"].matchesplayed,
            br_placetop25_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top25,
            br_placetop10_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top10,
            br_placetop1_keyboardmouse_m0_playlist_defaultsolo: userStats["solos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultduo: userStats["duos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultsquad: userStats["squads"].top1,
          },
          accountId: user.accountId,
        });
      } catch (error) {
        logger.error(`Failed to get stats: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );

  proxy.post("/statsv2/query", Validation.verifyPermissions, Validation.verifyToken, async (c) => {
    const permissions = c.get("permission");
    const timestamp = new Date().toISOString();

    const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

    if (!hasPermission)
      return c.json(
        errors.createError(
          401,
          c.req.url,
          permissions.errorReturn("fortnite:stats", "READ"),
          timestamp,
        ),
        401,
      );

    const body = await c.req.json();
    const query = c.req.query();

    console.log(body);
    console.log(query);

    return c.json({});
  });

  controller.get(
    "/stats/accountId/:accountId/bulk/window/alltime",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const accountId = c.req.param("accountId");

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      // update this to use findStatByAccountId

      const userStats = await seasonStatsService.findByAccountId(user.accountId);

      if (!userStats)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      return c.json([
        {
          name: "br_placetop6_pc_m0_p9",
          value: userStats.squads.top6,
        },
        {
          name: "br_placetop3_pc_m0_p9",
          value: userStats.squads.top3,
        },
        {
          name: "br_matchesplayed_pc_m0_p9",
          value: userStats.squads.matchesplayed,
        },
        {
          name: "br_placetop1_pc_m0_p9",
          value: userStats.squads.wins,
        },
        {
          name: "br_kills_pc_m0_p9",
          value: userStats.squads.kills,
        },
        {
          name: "br_minutesplayed_pc_m0_p9",
          value: 0,
        },
        {
          name: "br_placetop12_pc_m0_p10",
          value: userStats.duos.top12,
        },
        {
          name: "br_placetop5_pc_m0_p10",
          value: userStats.duos.top5,
        },
        {
          name: "br_matchesplayed_pc_m0_p10",
          value: userStats.duos.matchesplayed,
        },
        {
          name: "br_placetop1_pc_m0_p10",
          value: userStats.duos.wins,
        },
        {
          name: "br_kills_pc_m0_p10",
          value: userStats.duos.kills,
        },
        {
          name: "br_minutesplayed_pc_m0_p10",
          value: 0,
        },
        {
          name: "br_placetop25_pc_m0_p2",
          value: userStats.solos.top25,
        },
        {
          name: "br_placetop10_pc_m0_p2",
          value: userStats.solos.top10,
        },
        {
          name: "br_placetop1_pc_m0_p2",
          value: userStats.solos.wins,
        },
        {
          name: "br_kills_pc_m0_p2",
          value: userStats.solos.kills,
        },
        {
          name: "br_matchesplayed_pc_m0_p2",
          value: userStats.solos.matchesplayed,
        },
        {
          name: "br_minutesplayed_pc_m0_p2",
          value: 0,
        },
      ]);
    },
  );
}
