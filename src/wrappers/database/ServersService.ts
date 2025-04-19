import { LRUCache } from "lru-cache";
import { Servers, type ServerStatus } from "../../tables/servers";
import type { DeepPartial, EntityManager, Repository } from "typeorm";
import type Database from "../Database.wrapper";

export default class ServersService {
  private cache: LRUCache<string, Servers | Servers[]>;
  private serversRepository: Repository<Servers>;

  constructor(private database: Database) {
    this.serversRepository = this.database.getRepository("servers");

    this.cache = new LRUCache<string, Servers | Servers[]>({
      max: 500,
      ttl: 1000 * 60 * 5,
    });
  }

  private generateCacheKey(identifier: string, region: string, port: number): string {
    return `servers:${identifier}:${region}:${port}`;
  }

  async findServerByUserInQueue(accountId: string): Promise<Servers | null> {
    const server = await this.serversRepository
      .createQueryBuilder("servers")
      .where(":accountId = ANY(servers.queue)", { accountId })
      .getOne();

    return server || null;
  }

  async getServerByIdentifier(
    identifier: string,
    region: string,
    season: number,
    port: number,
  ): Promise<Servers | null> {
    const cacheKey = this.generateCacheKey(identifier, region, port);
    let server = this.cache.get(cacheKey) as Servers | null;

    if (!server) {
      server = await this.serversRepository.findOne({
        where: { identifier, options: { region }, port, version: season },
      });

      if (server) {
        this.cache.set(cacheKey, server);
      }
    }

    return server || null;
  }

  async getServerBySessionId(sessionId: string): Promise<Servers | null> {
    const server = await this.serversRepository.findOne({ where: { sessionId } });

    return server || null;
  }

  async getAllServers(): Promise<Servers[]> {
    return this.serversRepository.find();
  }

  async createServer(data: Partial<Servers>): Promise<Servers> {
    const newServer = this.serversRepository.create(data);
    const savedServer = await this.serversRepository.save(newServer);

    const cacheKey = `servers:${data.sessionId}`;
    this.cache.set(cacheKey, savedServer);

    return savedServer;
  }

  async updateServerQueue(
    identifier: string,
    region: string,
    port: number,
    queue: string[],
  ): Promise<void> {
    await this.serversRepository.update({ identifier, options: { region }, port }, { queue });
  }

  async updateServerStatus(
    identifier: string,
    region: string,
    port: number,
    status: ServerStatus,
  ): Promise<Servers | null> {
    return await this.serversRepository.manager.transaction(async (manager: EntityManager) => {
      const server = await manager.findOne(Servers, {
        where: { identifier, options: { region }, port },
      });

      if (server) {
        server.status = status;
        const updatedServer = await manager.save(Servers, server);

        const cacheKey = this.generateCacheKey(identifier, region, port);
        this.cache.set(cacheKey, updatedServer);

        return updatedServer;
      }

      return null;
    });
  }

  async getServersByStatus(status: ServerStatus): Promise<Servers[]> {
    const cacheKey = `servers:status:${status}`;
    let servers = this.cache.get(cacheKey) as Servers[];

    if (!servers) {
      servers = await this.serversRepository.find({ where: { status } });
      this.cache.set(cacheKey, servers);
    }

    return servers;
  }

  async getServersByRegionAndStatus(region: string, status: ServerStatus): Promise<Servers[]> {
    return await this.serversRepository
      .createQueryBuilder("servers")
      .where("servers.options.region = :region", { region })
      .andWhere("servers.status = :status", { status })
      .getMany();
  }

  async deleteServer(identifier: string, region: string, port: number): Promise<void> {
    await this.serversRepository.delete({ identifier, options: { region }, port });

    const cacheKey = this.generateCacheKey(identifier, region, port);
    this.cache.delete(cacheKey);
  }

  async deleteServerBySessionId(sessionId: string): Promise<void> {
    await this.serversRepository.delete({ sessionId });

    this.cache.delete(`servers:${sessionId}`);
  }

  async updateServerBySessionId(
    sessionId: string,
    updateData: DeepPartial<Servers>,
  ): Promise<Servers | null> {
    return await this.serversRepository.manager.transaction(async (manager: EntityManager) => {
      const server = await manager.findOne(Servers, { where: { sessionId } });

      if (server) {
        Object.assign(server, updateData);

        const updatedServer = await manager.save(Servers, server);

        const cacheKey = `servers:${sessionId}`;
        this.cache.set(cacheKey, updatedServer);

        return updatedServer;
      }

      return null;
    });
  }
}
