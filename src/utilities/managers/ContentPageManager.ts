import { contentPageService } from "../..";
import {
  BattleRoyaleNews,
  DynamicBackground,
  NewsBase,
  NewsPlatformMessage,
  PlaylistInfo,
  SubgameSelectData,
  TournamentDetail,
  type TournamentInfo,
} from "../../tables/contentpages/ContentPage";

export class ContentPageManager {
  private static mapPlatformMessages(messages: NewsPlatformMessage[]) {
    return messages.map(({ hidden, message, platform }) => ({ hidden, message, platform }));
  }

  private static mapPlaylistInfo(
    playlists: { image: string; playlistName: string; hidden: boolean; displayName: string }[],
  ) {
    return playlists.map(({ image, playlistName, hidden, displayName }) => ({
      image,
      playlist_name: playlistName,
      hidden,
      display_name: displayName,
    }));
  }

  private static mapTournaments(tournaments: TournamentDetail[]) {
    return tournaments.map(
      ({
        loadingScreenImage,
        titleColor,
        backgroundRightColor,
        backgroundTextColor,
        _type,
        tournamentDisplayId,
        highlightColor,
        primaryColor,
        titleLine1,
        shadowColor,
        backgroundLeftColor,
        posterFadeColor,
        secondaryColor,
        playlistTileImage,
        baseColor,
      }) => ({
        loading_screen_image: loadingScreenImage,
        title_color: titleColor,
        background_right_color: backgroundRightColor,
        background_text_color: backgroundTextColor,
        _type,
        tournament_display_id: tournamentDisplayId,
        highlight_color: highlightColor,
        primary_color: primaryColor,
        title_line_1: titleLine1,
        shadow_color: shadowColor,
        background_left_color: backgroundLeftColor,
        poster_fade_color: posterFadeColor,
        secondary_color: secondaryColor,
        playlist_tile_image: playlistTileImage,
        base_color: baseColor,
      }),
    );
  }

  public static async buildDynamicBackground() {
    const dynamicBackground = await contentPageService.getDynamicBackground();
    return dynamicBackground
      ? {
          backgrounds: dynamicBackground.backgrounds,
          _title: dynamicBackground._title,
          _noIndex: dynamicBackground._noIndex,
          _activeDate: dynamicBackground._activeDate,
          lastModified: dynamicBackground.lastModified,
          _locale: dynamicBackground._locale,
        }
      : null;
  }

  public static buildNewsBase(data: NewsBase) {
    return {
      platform_messages: this.mapPlatformMessages(data.platform_messages),
      _type: data._type,
      messages: data.messages,
    };
  }

  public static async buildBattleRoyaleNews() {
    const battleRoyaleNews = await contentPageService.getBattleRoyaleNews();
    return battleRoyaleNews
      ? {
          news: battleRoyaleNews.news,
          _title: battleRoyaleNews._title,
          _noIndex: battleRoyaleNews._noIndex,
          alwaysShow: battleRoyaleNews.alwaysShow,
          style: battleRoyaleNews.style,
          header: battleRoyaleNews.header,
          _activeDate: battleRoyaleNews._activeDate,
          lastModified: battleRoyaleNews.lastModified,
          _locale: battleRoyaleNews._locale,
        }
      : null;
  }

  public static async buildPlaylistInfo() {
    const playlistInfo = await contentPageService.getPlaylistInfo();
    return playlistInfo
      ? {
          playlist_info: {
            _type: playlistInfo.playlist_info._type,
            playlists: this.mapPlaylistInfo(playlistInfo.playlist_info.playlists),
          },
          frontend_matchmaking_header_style: playlistInfo.frontend_matchmaking_header_style,
          _title: playlistInfo._title,
          _noIndex: playlistInfo._noIndex,
          _activeDate: playlistInfo._activeDate,
          _locale: playlistInfo._locale,
        }
      : null;
  }

  public static async buildTournamentInfo() {
    const tournamentInfo = await contentPageService.getTournamentInfo();
    return tournamentInfo
      ? {
          tournament_info: {
            tournaments: this.mapTournaments(tournamentInfo.tournaments),
          },
          _title: tournamentInfo._title,
          _noIndex: tournamentInfo._noIndex,
          _activeDate: tournamentInfo._activeDate,
          lastModified: tournamentInfo.lastModified,
          _locale: tournamentInfo._locale,
        }
      : null;
  }

  public static async buildFullResponse() {
    const [dynamicbackgrounds, playlistinformation, battleroyalenews, tournamentinformation] =
      await Promise.all([
        this.buildDynamicBackground(),
        this.buildPlaylistInfo(),
        this.buildBattleRoyaleNews(),
        this.buildTournamentInfo(),
      ]);

    return {
      dynamicbackgrounds,
      playlistinformation,
      battleroyalenews,
      tournamentinformation,
    };
  }
}
