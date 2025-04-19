import type { ServerWebSocket } from "bun";
import type { LyntSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { logger } from "../../..";
import { XmppService } from "../saved/XmppServices";
import { updatePresenceForFriend } from "../utilities/UpdatePresenceForFriend";
import { getUserPresence } from "../utilities/GetUserPresence";
import SocketManager from "../../../utilities/managers/SocketManager";

export default async function (
  socket: ServerWebSocket<LyntSocket>,
  root: xmlparser.Node,
): Promise<void> {
  const rootType = root.attributes.type;
  const to = root.attributes.to;
  const children = root.children;

  switch (rootType) {
    case "unavailable":
      if (
        to.endsWith("@muc.prod.ol.epicgames.com") ||
        to.split("/")[0].endsWith("@muc.prod.ol.epicgames.com")
      ) {
        const roomName = to.split("@")[0];

        SocketManager.removeMemberFromRoom(roomName, socket.data.accountId as string);

        await SocketManager.sendPresenceUpdate(socket, roomName, "unavailable");
      }

      break;

    default:
      if (
        children.find((child) => child.name === "muc:x") ||
        children.find((child) => child.name === "x")
      ) {
        const roomName = to.split("@")[0];

        XmppService.xmppMucs[roomName] = XmppService.xmppMucs[roomName] || { members: [] };

        if (
          XmppService.xmppMucs[roomName].members.some(
            (member: { accountId: string }) => member.accountId === socket.data.accountId,
          )
        ) {
          return;
        }

        XmppService.xmppMucs[roomName].members.push({
          accountId: socket.data.accountId as string,
        });
        XmppService.joinedMUCs.push(roomName);

        await SocketManager.sendPresenceUpdate(socket, roomName, "available");

        await SocketManager.broadcastPresenceUpdate(
          socket,
          roomName,
          XmppService.xmppMucs[roomName].members.map((member: { accountId: string }) =>
            XmppService.clients.find((client) => client.accountId === member.accountId),
          ),
        );
      }
      break;
  }

  const findStatus = root.children.find((child) => child.name === "status");

  if (!findStatus || !findStatus.content) return;

  let parsedStatus: string = "";

  try {
    parsedStatus = JSON.parse(findStatus.content);
  } catch (error) {
    return void logger.error(`Failed to parse status: ${error}`);
  }

  if (!parsedStatus) return void logger.error("ParsedStatus is undefined.");

  const status = findStatus.content;

  let away = false;
  if (root.children.some((child) => child.name === "show")) away = true;

  await updatePresenceForFriend(socket, status, false, away);
  await getUserPresence(false, socket.data.accountId as string, socket.data.accountId as string);
}
