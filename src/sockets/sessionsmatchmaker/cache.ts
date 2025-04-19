import type { GameSession } from "./server";

export class Cache {
  private static sessions: Map<string, GameSession> = new Map();

  /**
   * Gets the session with the specified session ID.
   * @param sessionId The session ID to get the session for
   * @returns The session with the specified session ID, or undefined if no session is found
   */
  public static getSession(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Adds a session to the cache.
   * @param session The session to add to the cache
   * @returns The session with the specified session ID, or undefined if no session is found
   */
  public static addSession(session: GameSession): GameSession | undefined {
    if (!session.mmsSessionId) return undefined;
    this.sessions.set(session.mmsSessionId, session);

    return session;
  }

  /**
   * Removes a session from the cache.
   * @param sessionId The session ID to remove from the cache
   */
  public static removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clears all sessions from the cache.
   */
  public static clearSessions(): void {
    this.sessions.clear();
  }
}
