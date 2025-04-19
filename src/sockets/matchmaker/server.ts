import { config, logger, serversService, userService } from "../..";
import { Encryption } from "../../utilities/encryption";
import { MatchmakerStates } from "./mmstates";
import { v4 as uuid } from "uuid";
import { isPartyMemberExists } from "./utilities/isPartyMemberExists";
import { removeClientFromQueue } from "./utilities/removeClientFromQueue";
import { RegionIps } from "../../../hosting/hostOptions";
import { ServerStatus, type Servers } from "../../tables/servers";
import type { PartyMember } from "../xmpp/saved/XmppServices";

interface MatchmakerAttributes {
  "player.userAgent": string;
  "player.preferredSubregion": string;
  "player.option.spectator": string;
  "player.inputTypes": string;
  "player.revision": number;
  "player.teamFormat": string;
  "player.subregions": string;
  "player.season": number;
  "player.option.partyId": string;
  "player.platform": string;
  "player.option.linkType": string;
  "player.input": string;
  "playlist.revision": number;
  "player.option.fillTeam": boolean;
  "player.option.uiLanguage": string;
  "player.option.microphoneEnabled": boolean;
}

export interface MatchmakerSocket {
  accountId: string;
  bucketId: string;
  attributes: MatchmakerAttributes;
  expiresAt: string;
  nonce: string;
  sessionId: string;
  matchId: string;
  region: string;
  userAgent: string;
  playlist: string;
  partyMembers: PartyMember[];
}

export type Socket = {
  payload: MatchmakerSocket;
  identifier: string[];
  ticketId: string;
};

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findOrCreateServer(payload: MatchmakerSocket): Promise<Servers> {
  let existingServer = await serversService.getServerByIdentifier(
    payload.bucketId,
    payload.region,
    payload.attributes["player.season"],
    7777,
  );

  if (!existingServer) {
    const config = RegionIps[payload.region];
    if (!config) {
      logger.error(`No hoster found for the region: ${payload.region}`);
      throw new Error("Region configuration missing");
    }

    try {
      existingServer = await serversService.createServer({
        sessionId: payload.sessionId,
        status: ServerStatus.OFFLINE,
        version: payload.attributes["player.season"],
        identifier: payload.bucketId,
        address: config.address,
        port: config.port,
        queue: [],
        options: {
          region: payload.region,
          userAgent: payload.userAgent,
          matchId: payload.matchId,
          playlist: payload.playlist,
        },
      });
    } catch (error) {
      logger.error(`Failed to create server: ${error}`);
      throw new Error("Error creating server");
    }
  }

  return existingServer;
}

export const matchmakerServer = Bun.serve<Socket>({
  port: 443,
  async fetch(request, server) {
    try {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader) {
        return new Response("Authorization Payload is Invalid!", { status: 400 });
      }

      const [, , encrypted, json, signature] = authHeader.split(" ");

      if (!encrypted || !signature) {
        return new Response("Unauthorized request", { status: 401 });
      }

      const response = Encryption.decrypt(signature, config.client_secret);
      if (!response) {
        return new Response("Failed to decrypt Response!", { status: 400 });
      }

      let payload: MatchmakerSocket;
      try {
        payload = JSON.parse(response);
      } catch (error) {
        return new Response("Failed to parse decrypted Response!", { status: 400 });
      }

      const user = await userService.findUserByAccountId(payload.accountId);
      if (!user || user.banned) {
        return new Response("Unauthorized request", { status: 401 });
      }

      server.upgrade(request, {
        data: {
          payload,
          identifier: [],
          ticketId: uuid(),
        },
      });

      return undefined;
    } catch (error) {
      logger.error(`Error handling request: ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  websocket: {
    async open(socket) {
      try {
        const payload = socket.data.payload;
        const { accountId, region } = payload;

        const foundParty = isPartyMemberExists(accountId);
        if (!foundParty) {
          return socket.close(1011, "Party not found!");
        }

        let existingServer: Servers | null = null;

        if (!existingServer) {
          existingServer = await findOrCreateServer(payload);
        }

        if ("members" in foundParty && foundParty.members.length > 1) {
          const partyMemberIds = foundParty.members.map((member) => member.account_id);
          const newMembers = partyMemberIds.filter((id) => !existingServer!.queue.includes(id));

          if (newMembers.length > 0) {
            existingServer.queue.push(...newMembers);
            existingServer.updatedAt = new Date();
            await serversService.updateServerQueue(
              payload.bucketId,
              payload.region,
              7777,
              existingServer.queue,
            );
          }
        }

        if (!existingServer.queue.includes(accountId)) {
          existingServer.queue.push(accountId);
          existingServer.updatedAt = new Date();
          await serversService.updateServerQueue(
            payload.bucketId,
            payload.region,
            7777,
            existingServer.queue,
          );
        }

        MatchmakerStates.connecting(socket);
        MatchmakerStates.waiting(socket, foundParty);
        MatchmakerStates.queued(socket, socket.data.ticketId, foundParty, existingServer.queue);

        while (existingServer.status !== ServerStatus.ONLINE && existingServer.queue.length > 0) {
          await wait(2000);

          const refreshedServer = await serversService.getServerByIdentifier(
            existingServer.identifier,
            existingServer.options.region,
            payload.attributes["player.season"],
            existingServer.port,
          );

          if (!refreshedServer) {
            return socket.close(1011, "Server not found");
          }

          existingServer = refreshedServer;
        }

        if (existingServer.status === ServerStatus.ONLINE) {
          await removeClientFromQueue(foundParty, existingServer.queue);
          await serversService.updateServerQueue(
            existingServer.identifier,
            region,
            existingServer.port,
            existingServer.queue,
          );

          MatchmakerStates.sessionAssignment(socket, existingServer.options.matchId);
          MatchmakerStates.join(socket, existingServer.sessionId, existingServer.options.matchId);
        } else {
          socket.close(1011, "Server took too long to start");
        }
      } catch (error) {
        logger.error(`Error handling WebSocket open event: ${error}`);
        socket.close(1011, "Internal Server Error");
      }
    },
    async message(socket, message) {
      try {
        logger.debug("Received message");

        const payload = socket.data.payload;
        const { bucketId, region, playlist, userAgent, accountId, partyMembers } = payload;

        const existingServer = await serversService.getServerByIdentifier(
          payload.bucketId,
          region,
          payload.attributes["player.season"],
          7777,
        );

        if (!existingServer) {
          logger.warn(`No server found for socket: ${accountId}`);
          return;
        }

        const clientInQueue = existingServer.queue.includes(accountId);

        if (!clientInQueue) {
          logger.warn(`Client not found in queue for socket: ${accountId}`);
          return;
        }

        const foundParty = isPartyMemberExists(accountId);

        if (!foundParty) {
          return socket.close(1001, "Party not found!");
        }

        MatchmakerStates.queued(socket, socket.data.ticketId, foundParty, existingServer.queue);
      } catch (error) {
        logger.error(`Error handling WebSocket message event: ${error}`);
      }
    },
    async close(socket) {
      try {
        logger.debug("Closed!");

        const payload = socket.data.payload;
        const { bucketId, region, accountId } = payload;

        const existingServer = await serversService.getServerByIdentifier(
          payload.bucketId,
          region,
          payload.attributes["player.season"],
          7777,
        );

        if (!existingServer) {
          logger.warn(`No server found for socket: ${accountId}`);
          return;
        }

        const clientIndex = existingServer.queue.indexOf(accountId);
        if (clientIndex === -1) {
          logger.warn(`Client not found in queue for socket: ${accountId}`);
          return;
        }

        existingServer.queue.splice(clientIndex, 1);
        await serversService.updateServerQueue(bucketId, region, 7777, existingServer.queue);

        const partyOrClient = isPartyMemberExists(accountId);

        if (partyOrClient) {
          if (
            "members" in partyOrClient &&
            partyOrClient.members.length === 1 &&
            partyOrClient.members[0].account_id === accountId
          ) {
            if (existingServer.queue.length === 0) {
              await removeClientFromQueue(partyOrClient, existingServer.queue);
              await serversService.deleteServerBySessionId(existingServer.sessionId);
              logger.debug(`Removed empty server: ${existingServer.sessionId}`);
            }
          } else {
            await removeClientFromQueue(partyOrClient, existingServer.queue);
          }

          const party = isPartyMemberExists(accountId);
          if (party && "members" in party) {
            for (const member of party.members) {
              const memberInQueue = existingServer.queue.find((id) => id === member.account_id);

              if (!memberInQueue) {
                return socket.close(1000, "Party member is not in queue.");
              }
            }
          }
        } else {
          const index = existingServer.queue.indexOf(accountId);
          if (index !== -1) {
            existingServer.queue.splice(index, 1);
            await serversService.updateServerQueue(bucketId, region, 7777, existingServer.queue);
          }
        }
      } catch (error) {
        logger.error(`Error handling WebSocket close event: ${error}`);
      }
    },
  },
});
