import type { ServerWebSocket } from "bun";
import { sessions, type GameSession, type Socket } from "./server";
import { Cache } from "./cache";

export class SessionHelper {
  /**
   * Finds a session with the specified session ID.
   * @param sessionId The session ID of the session to find
   * @returns The session with the specified session ID, or undefined if no session is found
   */
  static getSessionById(sessionId: string): GameSession | undefined {
    return sessions.find((session) => session.mmsSessionId === sessionId);
  }

  /**
   * Finds a session with the specified match ID.
   * @param matchId The match ID of the session to find
   * @returns The session with the specified match ID, or undefined if no session is found
   */
  static getSessionByMatchId(matchId: string): GameSession | undefined {
    return sessions.find((session) => session.matchId === matchId);
  }

  /**
   * Finds a session with the specified connection.
   * @param connection The connection of the session to find
   * @returns The session with the specified connection, or undefined if no session is found
   */
  static getSessionByConnection(connection: ServerWebSocket<Socket>): GameSession | undefined {
    return sessions.find((session) => session.connection === connection);
  }

  /**
   * Creates a new session or finds an existing session with the specified bucket ID.
   * @param bucketId The bucket ID of the session to find
   * @returns The session with the specified bucket ID, or undefined if no session is found
   */
  static createOrFindSession(bucketId: string, gameSession?: GameSession): GameSession | undefined {
    const [buildId, , region, playlist] = bucketId.split(":");

    if (!buildId || !region || !playlist) return undefined;

    const session = sessions.find((session) => session.bucketId === bucketId);
    if (session) return session;

    // TODO - Add Some checking for a specific playlist. (eg, arena)
    if (gameSession && !session) {
      Cache.addSession(gameSession);

      return gameSession;
    }

    return undefined;
  }
}
