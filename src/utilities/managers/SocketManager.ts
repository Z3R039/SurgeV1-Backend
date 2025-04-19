import type { ServerWebSocket } from "bun";
import xmlbuilder from "xmlbuilder";
import type { LyntSocket } from "../../sockets/xmpp/client";
import { XmppService } from "../../sockets/xmpp/saved/XmppServices";

export default class SocketManager {
  static buildJabberFrom(
    roomName: string,
    displayName: string,
    accountId: string,
    resource: string,
  ): string {
    return `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
      displayName,
    )}:${accountId}:${resource}`;
  }

  static buildNick(
    roomName: string,
    displayName: string,
    accountId: string,
    resource: string,
  ): string {
    return this.buildJabberFrom(roomName, displayName, accountId, resource).replace(
      `${roomName}@muc.prod.ol.epicgames.com/`,
      "",
    );
  }

  static removeMemberFromRoom(roomName: string, accountId: string): void {
    const room = XmppService.xmppMucs[roomName];
    if (room) {
      const roomMemberIndex = room.members.findIndex(
        (member: { accountId: string }) => member.accountId === accountId,
      );
      if (roomMemberIndex !== -1) {
        room.members.splice(roomMemberIndex, 1);
        XmppService.joinedMUCs.splice(XmppService.joinedMUCs.indexOf(roomName), 1);
      }
    }
  }

  static async sendPresenceUpdate(
    socket: ServerWebSocket<LyntSocket>,
    roomName: string,
    type: "available" | "unavailable",
    role: string = "participant",
    affiliation: string = "none",
  ): Promise<void> {
    if (!socket.data.accountId || !socket.data.jid || !socket.data.resource) return;

    const from = this.buildJabberFrom(
      roomName,
      socket.data.displayName as string,
      socket.data.accountId,
      socket.data.resource,
    );
    const nick = this.buildNick(
      roomName,
      socket.data.displayName as string,
      socket.data.accountId,
      socket.data.resource,
    );

    socket.send(
      xmlbuilder
        .create("presence")
        .attribute("to", socket.data.jid)
        .attribute("from", from)
        .attribute("type", type)
        .attribute("xmlns", "jabber:client")
        .element("x")
        .attribute("xmlns", "http://jabber.org/protocol/muc#user")
        .element("item")
        .attribute("nick", nick)
        .attribute("jid", socket.data.jid)
        .attribute("role", role)
        .attribute("affiliation", affiliation)
        .up()
        .element("status")
        .attribute("code", "110")
        .up()
        .element("status")
        .attribute("code", "100")
        .up()
        .element("status")
        .attribute("code", "170")
        .up()
        .toString({ pretty: true }),
    );
  }

  static async broadcastPresenceUpdate(
    socket: ServerWebSocket<LyntSocket>,
    roomName: string,
    clients: any[],
  ): Promise<void> {
    for (const client of clients) {
      if (!client) continue;

      const from = this.buildJabberFrom(
        roomName,
        client.displayName as string,
        client.accountId,
        client.resource,
      );
      const nick = this.buildNick(
        roomName,
        client.displayName as string,
        client.accountId,
        client.resource,
      );

      socket.send(
        xmlbuilder
          .create("presence")
          .attribute("from", from)
          .attribute("to", socket.data.jid)
          .attribute("xmlns", "jabber:client")
          .element("x")
          .attribute("xmlns", "http://jabber.org/protocol/muc#user")
          .element("item")
          .attribute("nick", nick)
          .attribute("jid", client.jid)
          .attribute("role", "participant")
          .attribute("affiliation", "none")
          .up()
          .up()
          .toString({ pretty: true }),
      );

      if (socket.data.accountId === client.accountId) continue;

      client?.socket?.send(
        xmlbuilder
          .create("presence")
          .attribute("from", from)
          .attribute("to", client.jid)
          .attribute("xmlns", "jabber:client")
          .element("x")
          .attribute("xmlns", "http://jabber.org/protocol/muc#user")
          .element("item")
          .attribute("nick", nick)
          .attribute("jid", socket.data.jid)
          .attribute("role", "participant")
          .attribute("affiliation", "none")
          .up()
          .up()
          .toString({ pretty: true }),
      );
    }
  }
}
