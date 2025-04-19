import { Repository } from "typeorm";
import { LRUCache } from "lru-cache";
import type Sessions from "../../tables/sessions";
import type Database from "../Database.wrapper";

export default class SessionsService {
  private readonly gameSessionRepository: Repository<Sessions>;
  private readonly cache: LRUCache<string, Sessions>;

  constructor(private database: Database) {
    this.gameSessionRepository = database.getRepository("sessions");

    this.cache = new LRUCache<string, Sessions>({
      max: 100,
      ttl: 1000 * 60 * 5,
    });
  }

  async create(gameSessionData: Partial<Sessions>): Promise<Sessions> {
    const gameSession = this.gameSessionRepository.create(gameSessionData);
    const savedSession = await this.gameSessionRepository.save(gameSession);
    this.cache.set(savedSession.ownerId, savedSession);
    return savedSession;
  }

  async delete(sessionId: string): Promise<void> {
    const result = await this.gameSessionRepository.delete(sessionId);
    if (result.affected === 0) {
      throw new Error(`GameSession with ID "${sessionId}" not found`);
    }
    this.cache.delete(sessionId);
  }

  async update(sessionId: string, updateData: Partial<Sessions>): Promise<Sessions> {
    const session = await this.findSessionBySessionId(sessionId);
    Object.assign(session, updateData);
    const updatedSession = await this.gameSessionRepository.save(session);
    this.cache.set(updatedSession.ownerId, updatedSession);
    return updatedSession;
  }

  public async findSessionBySessionId(sessionId: string): Promise<Sessions> {
    const cachedSession = this.cache.get(sessionId);
    if (cachedSession) {
      return cachedSession;
    }

    const session = await this.gameSessionRepository.findOneBy({ sessionId });
    if (!session) {
      throw new Error(`GameSession with ID "${sessionId}" not found`);
    }

    this.cache.set(sessionId, session);
    return session;
  }
}
