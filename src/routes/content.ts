import { app, contentPageService } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import path from "node:path";
import { file } from "bun";
import type { ContentPages } from "../../types/contentpages";
import { ContentPageManager } from "../utilities/managers/ContentPageManager";
import { randomUUID } from "node:crypto";

export default function () {
  app.get("/content/api/pages/fortnite-game", async (c) => {
    const userAgent = c.req.header("User-Agent");
    const timestamp = new Date().toISOString();

    if (!userAgent) {
      return c.json(
        errors.createError(400, c.req.url, "Header 'User-Agent' is missing.", timestamp),
        400,
      );
    }

    const uahelper = uaparser(userAgent);
    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const dbdynamicbackground = await contentPageService.getDynamicBackground();
    const dbplaylistinfo = await contentPageService.getPlaylistInfo();
    const dbbattleroyalenews = await contentPageService.getBattleRoyaleNews();

    if (!dbdynamicbackground) {
      await contentPageService.createDynamicBackground({
        backgrounds: {
          backgrounds: [],
          _type: "DynamicBackgroundList",
        },
        _title: "dynamicbackgrounds",
        _noIndex: false,
        _activeDate: new Date(),
        lastModified: new Date(),
        _locale: "en-US",
      });
    }

    if (!dbplaylistinfo) {
      await contentPageService.createPlaylistInfo({
        playlist_info: {
          _type: "FortPlaylistInfo",
          playlists: [
            {
              id: "Playlist_DefaultSolo",
              playlistName: "Playlist_DefaultSolo",
              hidden: false,
              displayName: "Solo",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_DefaultSquad",
              playlistName: "Playlist_DefaultSquad",
              hidden: false,
              displayName: "Squad",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_DefaultDuo",
              playlistName: "Playlist_DefaultDuo",
              hidden: false,
              displayName: "Duo",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_PlaygroundV2",
              playlistName: "Playlist_PlaygroundV2",
              hidden: false,
              displayName: "Playground",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_Playground",
              playlistName: "Playlist_Playground",
              hidden: false,
              displayName: "Playground",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_BattleLab",
              playlistName: "Playlist_BattleLab",
              hidden: false,
              displayName: "Battle Lab",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_ShowdownAlt_Solo",
              playlistName: "Playlist_ShowdownAlt_Solo",
              hidden: false,
              displayName: "Arena",
              image: "",
              _type: "FortPlaylistInfo",
            },
            {
              id: "Playlist_ShowdownAlt_Duos",
              playlistName: "Playlist_ShowdownAlt_Duos",
              hidden: true,
              displayName: "Arena",
              image: "",
              _type: "FortPlaylistInfo",
            },
          ],
        },
        lastModified: new Date(),
        _activeDate: new Date(),
        frontend_matchmaking_header_style: "None",
        _title: "playlistinformation",
        _noIndex: false,
        _locale: "en-US",
      });
    }

    if (!dbbattleroyalenews) {
      await contentPageService.createBattleRoyaleNews({
        news: {
          id: randomUUID().replace(/-/g, ""),
          platform_messages: [
            {
              id: randomUUID().replace(/-/g, ""),
              hidden: false,
              _type: "CommonUI Simple Message Platform",
              message: {
                image:
                  "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v11/v1101/11BR_EpicGamesAndroidLauncherAssets_MOTD-1024x512-18dd3ddb2b4297abde65e0d898244181f4581326.jpg",
                hidden: false,
                _type: "CommonUI Simple Message Base",
                subgame: "br",
                title: "Epic Games app",
                body: "The Fortnite Installer on Android is now the Epic Games app!\nUse it to download Fortnite on Android and check out all that's new in #FortniteChapter2",
                spotlight: false,
                id: randomUUID().replace(/-/g, ""),
              },
              platform: "android",
            },
          ],
          _type: "Battle Royale News",
          messages: [
            {
              id: randomUUID().replace(/-/g, ""),
              image:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v42/BR04_MOTD_Shield-1024x512-75eacc957ecc88e76693143b6256ba06159efb76.jpg",
              hidden: false,
              messagetype: "normal",
              _type: "CommonUI Simple Message Base",
              title: "Keep Your Account Secure",
              body: "Avoid scam sites offering free V-Bucks. Epic will never ask for your password. Enable Two-Factor Authentication to help stay secure!",
              spotlight: false,
            },
            {
              id: randomUUID().replace(/-/g, ""),
              image:
                "https://cdn2.unrealengine.com/Fortnite%2Fblog%2FSeason+6+Blog%2FBR06_Nintendo_HeroBanner-1920x1080-b9980da0c0cfb4a871f8a9cff403a3799a080a1f.jpg",
              hidden: false,
              messagetype: "normal",
              _type: "CommonUI Simple Message Base",
              title: "Season 6 Battle Pass Now Available!",
              body: "Unlock exclusive rewards, including Calamity and DJ Yonder skins, with the Season 6 Battle Pass.",
              spotlight: false,
            },
          ],
        },
        _title: "battleroyalnews",
        _noIndex: false,
        alwaysShow: false,
        style: "SpecialEvent",
        header: "",
        _activeDate: new Date(),
        lastModified: new Date(),
        _locale: "en-US",
      });
    }

    // Checking S7 cus we're probably going to do tournaments in S7 anyways
    if (uahelper.season >= 7) {
      const dbtournamentinfo = await contentPageService.getTournamentInfo();

      if (!dbtournamentinfo) {
        await contentPageService.createTournamentInfo({
          tournaments: [
            {
              id: randomUUID().replace(/-/g, ""),
              loadingScreenImage:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
              titleColor: "0BFFAC",
              backgroundRightColor: "41108C",
              backgroundTextColor: "390087",
              _type: "TournamentDisplayInfo",
              tournamentDisplayId: "lynt_arena_duos",
              highlightColor: "FFFFFF",
              primaryColor: "0BFFAC",
              titleLine1: "ARENA",
              shadowColor: "5000BE",
              backgroundLeftColor: "B537FB",
              posterFadeColor: "420793",
              secondaryColor: "FF1A40",
              playlistTileImage:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
              baseColor: "FFFFFF",
            },
            {
              id: randomUUID().replace(/-/g, ""),
              loadingScreenImage:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
              titleColor: "0BFFAC",
              backgroundRightColor: "41108C",
              backgroundTextColor: "390087",
              _type: "TournamentDisplayInfo",
              tournamentDisplayId: "lynt_arena_solo",
              highlightColor: "FFFFFF",
              primaryColor: "0BFFAC",
              titleLine1: "ARENA",
              shadowColor: "5000BE",
              backgroundLeftColor: "B537FB",
              posterFadeColor: "420793",
              secondaryColor: "FF1A40",
              playlistTileImage:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
              baseColor: "FFFFFF",
            },
          ],
          _title: "tournamentinformation",
          _noIndex: false,
          _activeDate: new Date(),
          lastModified: new Date(),
          _locale: "en-US",
        });
      }
    }

    const fullResponse = await ContentPageManager.buildFullResponse();

    if (!fullResponse.dynamicbackgrounds)
      return c.json(
        errors.createError(500, c.req.url, "Failed to load dynamic backgrounds", timestamp),
      );

    fullResponse.dynamicbackgrounds.backgrounds.backgrounds.push(
      { stage: uahelper.background, _type: "DynamicBackground", key: "vault" },
      { stage: uahelper.background, _type: "DynamicBackground", key: "lobby" },
    );

    if (uahelper.season >= 19) {
      fullResponse.dynamicbackgrounds.backgrounds.backgrounds.push({
        stage: "defaultnotris",
        _type: "DynamicBackground",
        key: "lobby",
        backgroundimage:
          "https://cdn2.unrealengine.com/nocturnal-storebg-cms-1921x1081-796115fa0fc9.png",
      });
    }

    const playlistImagesBySeason: {
      [key: number]: {
        solo: string;
        duo: string;
        squad: string;
        playground?: string;
        battlelab?: string;
        arenasolo?: string;
        arenaduo?: string;
      };
    } = {
      6: {
        solo: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/playlisttiles/BR_LobbyTileArt_Solo-512x512-24446ea2a54612c5604ecf0e30475b4dec81c3bc.png",
        duo: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/playlisttiles/BR_LobbyTileArt_Duo-512x512-5dea8dfae97bddcd4e204dd47bfb245d3f68fc7b.png",
        squad:
          "https://cdn2.unrealengine.com/Fortnite/fortnite-game/playlisttiles/BR_LobbyTileArt_Squad-512x512-5225ec6ca3265611957834c2c549754fe1778449.png",
        playground:
          "https://cdn2.unrealengine.com/Fortnite/fortnite-game/playlisttiles/BR_LTM-Tile_Playground-1024x512-53db8a4b5fb41251af279eaf923bc00ecbc17792.jpg",
      },
      7: {
        solo: "https://i.ibb.co/23sNKqJ/66f8c6d28f8464-55630287-Processed.jpg",
        duo: "",
        squad: "",
      },
    };

    if (!fullResponse.playlistinformation)
      return c.json(
        errors.createError(500, c.req.url, "Failed to load playlist information", timestamp),
      );

    const playlistImages = playlistImagesBySeason[uahelper.season];

    if (playlistImages) {
      fullResponse.playlistinformation.playlist_info.playlists.forEach((playlist) => {
        if (playlist.playlist_name === "Playlist_DefaultSolo") {
          playlist.image = playlistImages.solo;
        } else if (playlist.playlist_name === "Playlist_DefaultDuo") {
          playlist.image = playlistImages.duo;
        } else if (playlist.playlist_name === "Playlist_DefaultSquad") {
          playlist.image = playlistImages.squad;
        } else if (playlist.playlist_name === "Playlist_PlaygroundV2") {
          if (!playlistImages.playground) return;
          playlist.image = playlistImages.playground;
        } else if (playlist.playlist_name === "Playlist_BattleLab") {
          if (!playlistImages.battlelab) return;
          playlist.image = playlistImages.battlelab;
        } else if (playlist.playlist_name === "Playlist_ShowdownAlt_Solo") {
          if (!playlistImages.arenasolo) return;
          playlist.image = playlistImages.arenasolo;
        } else if (playlist.playlist_name === "Playlist_ShowdownAlt_Duos") {
          if (!playlistImages.arenaduo) return;
          playlist.image = playlistImages.arenaduo;
        } else if (playlist.playlist_name === "Playlist_Playground") {
          if (!playlistImages.playground) return;
          playlist.image = playlistImages.playground;
        }
      });
    }

    return c.json(fullResponse);
  });
}
