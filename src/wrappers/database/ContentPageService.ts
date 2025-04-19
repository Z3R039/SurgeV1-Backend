import type { Repository } from "typeorm";
import type {
  BattleRoyaleNews,
  CommonMessageBase,
  DynamicBackground,
  PlaylistInfo,
  SubgameSelectData,
  TournamentInfo,
} from "../../tables/contentpages/ContentPage";
import type Database from "../Database.wrapper";

export class ContentPageService {
  private subgameRepository: Repository<SubgameSelectData>;
  private messageRepository: Repository<CommonMessageBase>;
  private dynamicBackgroundRepository: Repository<DynamicBackground>;
  private battleRoyaleNewsRepository: Repository<BattleRoyaleNews>;
  private playlistInfoRepository: Repository<PlaylistInfo>;
  private tournamentInfoRepository: Repository<TournamentInfo>;

  constructor(private database: Database) {
    this.subgameRepository = database.getRepository("subgame_select_data");
    this.messageRepository = database.getRepository("common_message_base");
    this.dynamicBackgroundRepository = database.getRepository("dynamic_background");
    this.battleRoyaleNewsRepository = database.getRepository("battle_royale_news");
    this.playlistInfoRepository = database.getRepository("playlist_info");
    this.tournamentInfoRepository = database.getRepository("tournament_info");
  }

  async createSubgameSelectData(data: Partial<SubgameSelectData>) {
    const newSubgameData = this.subgameRepository.create(data);
    return await this.subgameRepository.save(newSubgameData);
  }

  async updateSubgameSelectData(id: string, updates: Partial<SubgameSelectData>) {
    await this.subgameRepository.update(id, updates);
    return this.subgameRepository.findOneBy({ id });
  }

  async addMessage(subgameId: string, messageData: Partial<CommonMessageBase>) {
    const subgame = await this.subgameRepository.findOneBy({ id: subgameId });
    if (!subgame) throw new Error("Subgame not found");

    const newMessage = this.messageRepository.create(messageData);
    await this.messageRepository.save(newMessage);
    subgame.saveTheWorldUnowned = newMessage;
    return await this.subgameRepository.save(subgame);
  }

  async updateMessage(subgameId: string, messageId: string, updates: Partial<CommonMessageBase>) {
    const subgame = await this.subgameRepository.findOneBy({ id: subgameId });
    if (!subgame) throw new Error("Subgame not found");

    const message = await this.messageRepository.findOneBy({ id: messageId });
    if (!message) throw new Error("Message not found");

    await this.messageRepository.update(messageId, updates);
    subgame.saveTheWorldUnowned = message;
    return await this.subgameRepository.save(subgame);
  }

  async deleteMessage(subgameId: string, messageId: string) {
    const subgame = await this.subgameRepository.findOneBy({ id: subgameId });
    if (!subgame) throw new Error("Subgame not found");

    const message = await this.messageRepository.findOneBy({ id: messageId });
    if (!message) throw new Error("Message not found");

    await this.messageRepository.delete(messageId);
    Object.assign(subgame.saveTheWorldUnowned, {
      hidden: true,
    });
    return await this.subgameRepository.save(subgame);
  }

  async createDynamicBackground(data: Partial<DynamicBackground>) {
    const newDynamicBackground = this.dynamicBackgroundRepository.create(data);
    return await this.dynamicBackgroundRepository.save(newDynamicBackground);
  }

  async updateDynamicBackground(id: string, updates: Partial<DynamicBackground>) {
    await this.dynamicBackgroundRepository.update(id, updates);
    return this.dynamicBackgroundRepository.findOneBy({ id });
  }

  async deleteDynamicBackground(id: string) {
    await this.dynamicBackgroundRepository.delete(id);
    return this.dynamicBackgroundRepository.findOneBy({ id });
  }

  async createBattleRoyaleNews(data: Partial<BattleRoyaleNews>) {
    const newBattleRoyaleNews = this.battleRoyaleNewsRepository.create(data);
    return await this.battleRoyaleNewsRepository.save(newBattleRoyaleNews);
  }

  async updateBattleRoyaleNews(id: string, updates: Partial<BattleRoyaleNews>) {
    await this.battleRoyaleNewsRepository.update(id, updates);
    return this.battleRoyaleNewsRepository.findOneBy({ id });
  }

  async deleteBattleRoyaleNews(id: string) {
    await this.battleRoyaleNewsRepository.delete(id);
    return this.battleRoyaleNewsRepository.findOneBy({ id });
  }

  async createPlaylistInfo(data: Partial<PlaylistInfo>) {
    const newPlaylistInfo = this.playlistInfoRepository.create(data);
    return await this.playlistInfoRepository.save(newPlaylistInfo);
  }

  async updatePlaylistInfo(id: string, updates: Partial<PlaylistInfo>) {
    await this.playlistInfoRepository.update(id, updates);
    return this.playlistInfoRepository.findOneBy({ id });
  }

  async deletePlaylistInfo(id: string) {
    await this.playlistInfoRepository.delete(id);
    return this.playlistInfoRepository.findOneBy({ id });
  }

  async createTournamentInfo(data: Partial<TournamentInfo>) {
    const newTournamentInfo = this.tournamentInfoRepository.create(data);
    return await this.tournamentInfoRepository.save(newTournamentInfo);
  }

  async updateTournamentInfo(id: string, updates: Partial<TournamentInfo>) {
    await this.tournamentInfoRepository.update(id, updates);
    return this.tournamentInfoRepository.findOneBy({ id });
  }

  async deleteTournamentInfo(id: string) {
    await this.tournamentInfoRepository.delete(id);
    return this.tournamentInfoRepository.findOneBy({ id });
  }

  async getDynamicBackground() {
    return await this.dynamicBackgroundRepository.findOneBy({ _title: "dynamicbackgrounds" });
  }

  async getPlaylistInfo() {
    return await this.playlistInfoRepository.findOneBy({ _title: "playlistinformation" });
  }

  async getBattleRoyaleNews() {
    return await this.battleRoyaleNewsRepository.findOneBy({ _title: "battleroyalnews" });
  }

  async getTournamentInfo() {
    return await this.tournamentInfoRepository.findOneBy({ _title: "tournamentinformation" });
  }
}
