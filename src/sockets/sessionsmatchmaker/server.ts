import { config, logger } from "../..";
import { v4 as uuid } from "uuid";
import { Utils } from "./utils";
import type { ServerWebSocket } from "bun";
import { string } from "zod";
import { SessionHelper } from "./SessionHelper";
import { Encryption } from "../../utilities/encryption";
import type { PartyMember } from "../xmpp/saved/XmppServices";

interface SessionTicketPayload {
  sessionId: string;
}

export type Socket = {
  payload: SessionTicketPayload;
  signature: PayloadResponse;
  matchId: string;
};

export interface GameSession {
  matchId: string;
  connection: ServerWebSocket<Socket>;
  isAssigned: boolean;
  isAssigning: boolean;
  mmsSessionId: string;
  teams: any[];
  region: string;
  playlist: string;
  bucketId: string;
  buildUniqueId: string;
  getRegion(): string;
  emitSessionRegistered(): void;
}

interface MatchmakerPayload<T> {
  name: string;
  payload: T;
}

interface SessionAssignMatchResultPayload {
  matchId: string;
  result: string;
}

interface PayloadResponse {
  accountId: string;
  bucketId: string;
  region: string;
  userAgent: string;
  playlist: string;
  partyPlayerIds: PartyMember[] | string[];
  buildUniqueId: string;
}

export const sessions: GameSession[] = [];

export const sessionsMatchmakerServer = Bun.serve<Socket>({
  port: 899,
  async fetch(request, server) {
    try {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader) {
        return new Response("Unauthorized", { status: 401 });
      }

      const [, , encrypted, json, signature] = authHeader.split(" ");

      if (!encrypted || !json || !signature) {
        return new Response("Unauthorized", { status: 401 });
      }

      const response = Encryption.decrypt(signature, config.client_secret);
      if (!response) {
        return new Response("Unauthorized", { status: 401 });
      }

      let signatureResponse: PayloadResponse;
      try {
        signatureResponse = JSON.parse(response);
      } catch (error) {
        return new Response("Unauthorized", { status: 401 });
      }

      let payload: SessionTicketPayload;
      try {
        payload = JSON.parse(json);
      } catch (error) {
        return new Response("Unauthorized", { status: 401 });
      }

      server.upgrade(request, {
        data: {
          payload,
          signature: signatureResponse,
          matchId: Utils.generateMatchId(),
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
        const { payload, matchId, signature } = socket.data;

        const newSession: GameSession = {
          matchId,
          connection: socket,
          isAssigned: false,
          isAssigning: false,
          mmsSessionId: payload.sessionId,
          region: signature.region,
          playlist: signature.playlist,
          teams: signature.partyPlayerIds,
          bucketId: signature.bucketId,
          buildUniqueId: signature.buildUniqueId,
          getRegion: () => signature.region,
          emitSessionRegistered: () => {
            socket.send(
              JSON.stringify({
                name: "Registered",
                data: {},
              }),
            );
          },
        };

        sessions.push(newSession);

        SessionHelper.createOrFindSession(newSession.bucketId!, newSession);

        logger.debug(`New session: ${newSession.mmsSessionId} IP: ${socket.remoteAddress}`);

        newSession.emitSessionRegistered();
      } catch (error) {
        logger.error(`Error handling WebSocket open event: ${error}`);
        socket.close(1011, "Internal Server Error");
      }
    },
    async message(socket, message) {
      try {
        logger.debug("Received message");

        if (message instanceof string && message.includes("ping")) return;

        console.log(message);

        if (message instanceof Buffer) {
          message = message.toString();
        }

        if (message === "ping") {
          return;
        }

        const assignMatchResult = JSON.parse(
          message,
        ) as MatchmakerPayload<SessionAssignMatchResultPayload>;

        if (assignMatchResult && assignMatchResult.name === "AssignMatchResult") {
          const match = sessions.find(
            (session) => session.matchId === assignMatchResult.payload.matchId,
          );
          console.log(match);

          if (match) {
            if (assignMatchResult.payload.result.toLowerCase() === "ready") {
              logger.debug(`Assigned match: ${assignMatchResult.payload.matchId}`);

              match.isAssigned = true;
              match.isAssigning = true;
            } else if (assignMatchResult.payload.result.toLowerCase() === "failed") {
              logger.debug(`Failed to assign match: ${assignMatchResult.payload.matchId}`);

              sessions.splice(sessions.indexOf(match), 1);
            }
          }
        }
      } catch (error) {
        logger.error(`Error handling WebSocket message event: ${error}`);
      }
    },
    async close(socket) {
      try {
        logger.debug("Closed!");

        const sessionIndex = sessions.findIndex((session) => session.connection === socket);

        if (sessionIndex !== -1) {
          sessions.splice(sessionIndex, 1);
        }
      } catch (error) {
        logger.error(`Error handling WebSocket close event: ${error}`);
      }
    },
  },
});
