import type { Context } from "hono";
import { app, friendsService, logger, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";
import { XmppService, type PartyMember } from "../sockets/xmpp/saved/XmppServices";
import { v4 as uuid } from "uuid";
import uaparser from "../utilities/uaparser";
import xmlbuilder from "xmlbuilder";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

export default function () {
  app.get("/party/api/v1/Fortnite/user/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const foundParty = Object.values(XmppService.parties).find((party) =>
      party.members.some((member) => member.account_id === accountId),
    );
    return c.json({
      current: foundParty || [],
      pending: [],
      invites: [],
      pings: [],
    });
  });

  app.post("/party/api/v1/Fortnite/parties", async (c) => {
    const body = await c.req.json();
    const id = uuid().replace(/-/g, "");
    const currentTimeISO = new Date().toISOString();

    const party = {
      id,
      created_at: currentTimeISO,
      updated_at: currentTimeISO,
      config: body.config,
      members: [
        {
          account_id: body.join_info.connection.id?.split("@prod")[0] || "",
          meta: body.join_info.meta || {},
          connections: [
            {
              id: body.join_info.connection.id || "",
              connected_at: currentTimeISO,
              updated_at: currentTimeISO,
              yield_leadership: body.join_info.connection.yield_leadership,
              meta: body.join_info.connection.meta || {},
            },
          ],
          revision: 0,
          updated_at: currentTimeISO,
          joined_at: currentTimeISO,
          role: "CAPTAIN",
        },
      ],
      meta: body.meta || {},
      invites: [],
      applicants: [],
      revision: 0,
      intentions: [],
    };

    XmppService.parties[id] = party;
    return c.json(party);
  });

  app.get("/party/api/v1/Fortnite/parties/:partyId", async (c) => {
    const partyId = c.req.param("partyId");
    const party = XmppService.parties[partyId];

    if (!party) {
      const timestamp = new Date().toISOString();
      return c.json(errors.createError(404, c.req.url, "Party not found.", timestamp), 404);
    }

    return c.json(party);
  });

  app.patch("/party/api/v1/Fortnite/parties/:partyId", Validation.verifyToken, async (c) => {
    const partyId = c.req.param("partyId");
    const party = XmppService.parties[partyId];

    if (!party) {
      const timestamp = new Date().toISOString();
      return c.json(errors.createError(404, c.req.url, "Party not found.", timestamp), 404);
    }

    const body = await c.req.json();
    const user = c.get("user");
    const clientIndex = XmppService.clients.findIndex(
      (client) => client.accountId === user.accountId,
    );

    if (clientIndex === -1) {
      const timestamp = new Date().toISOString();
      return c.json(errors.createError(404, c.req.url, "Client not found.", timestamp), 404);
    }
    if (body.config) {
      Object.assign(party.config, body.config);
    }

    if (Array.isArray(body.meta.delete)) {
      body.meta.delete.forEach((prop: any) => delete party.meta[prop]);
    }

    if (body.meta.update) {
      Object.assign(party.meta, body.meta.update);
    }

    party.revision++;

    const captain = party.members.find((member) => member.role === "CAPTAIN");

    party.updated_at = new Date().toISOString();
    XmppService.parties[partyId] = party;

    party.members.forEach((member) => {
      const client = XmppService.clients.find((c) => c.accountId === member.account_id);
      if (!client) return;

      client.socket.send(
        xmlbuilder
          .create("message")
          .attribute("xmlns", "jabber:client")
          .attribute("to", client.jid)
          .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
          .element(
            "body",
            JSON.stringify({
              captain_id: captain!.account_id,
              party_state_updated: body.meta.update,
              party_state_removed: body.meta.delete,
              party_state_overriden: body.meta.update,
              party_privacy_type: party.config["joinability"],
              party_type: party.config["type"],
              party_sub_type: party.config["sub_type"],
              max_number_of_members: party.config["max_size"],
              invite_ttl_seconds: party.config["invite_ttl"],
              intention_ttl_seconds: party.config["intention_ttl"],
              updated_at: new Date().toISOString(),
              created_at: party.created_at,
              ns: "Fortnite",
              party_id: party.id,
              sent: new Date().toISOString(),
              revision: party.revision,
              type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
            }),
          )
          .up()
          .toString(),
      );
    });

    return c.body(null, 200);
  });

  app.post(
    "/party/api/v1/Fortnite/parties/:partyId/invites/:accountId",
    Validation.verifyToken,
    async (c) => {
      const partyId = c.req.param("partyId");
      const accountId = c.req.param("accountId");
      const party = XmppService.parties[partyId];
      const timestamp = new Date().toISOString();

      if (!party) {
        return c.json(errors.createError(404, c.req.url, "Party not found.", timestamp), 404);
      }

      const body = await c.req.json();
      const date = new Date();
      date.setHours(date.getHours() + 1);

      const newInvite = {
        party_id: party.id,
        sent_by: c.get("user").accountId,
        meta: body,
        sent_to: accountId,
        sent_at: timestamp,
        updated_at: timestamp,
        expires_at: date.toISOString(),
        status: "SENT",
      };

      party.invites.push(newInvite);
      party.updated_at = timestamp;
      XmppService.parties[partyId] = party;

      const inviter = party.members.find((member) => member.account_id === c.get("user").accountId);
      if (!inviter) {
        return c.json(errors.createError(404, c.req.url, "Inviter not found.", timestamp), 404);
      }

      const friends = await friendsService.findFriendByAccountId(c.get("user").accountId);
      if (!friends) {
        return c.json(errors.createError(404, c.req.url, "Friend not found.", timestamp), 404);
      }

      const client = XmppService.clients.find((cl) => cl.accountId === accountId);
      if (client) {
        const inviteDetails = {
          expires: newInvite.expires_at,
          meta: body,
          ns: "Fortnite",
          party_id: party.id,
          inviter_dn: inviter.meta["urn:epic:member:dn_s"],
          inviter_id: c.get("user").accountId,
          invitee_id: accountId,
          members_count: party.members.length,
          sent_at: newInvite.sent_at,
          updated_at: newInvite.updated_at,
          friends_ids: party.members
            .filter((member) =>
              friends.accepted.some((friend) => friend.accountId === member.account_id),
            )
            .map((member) => member.account_id),
          sent: timestamp,
          type: "com.epicgames.social.party.notification.v0.INITIAL_INVITE",
        };

        const message = xmlbuilder
          .create("message")
          .attribute("xmlns", "jabber:client")
          .attribute("to", client.jid)
          .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
          .element("body", JSON.stringify(inviteDetails))
          .up()
          .toString();

        client.socket.send(message);
      }

      const sendPing = c.req.query("sendPing");
      if (sendPing === "true") {
        // TODO
      }

      return c.body(null, 200);
    },
  );

  app.patch(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId/meta",
    Validation.verifyToken,
    async (c) => {
      const partyId = c.req.param("partyId");
      const accountId = c.req.param("accountId");
      const party = XmppService.parties[partyId];

      const timestamp = new Date().toISOString();

      if (!party) {
        return c.json(errors.createError(404, c.req.url, "Party not found.", timestamp), 404);
      }

      const body = await c.req.json();

      let memberIndex: number = -1;

      for (const member of party.members) {
        if (member.account_id == accountId) {
          memberIndex = party.members.indexOf(member);
          break;
        }
      }

      const member = party.members[memberIndex];

      for (var prop of Object.keys(body.delete)) {
        delete member.meta[prop];
      }

      for (var prop of Object.keys(body.update)) {
        member.meta[prop] = body.update[prop];
      }

      member.updated_at = new Date().toISOString();
      party.members[memberIndex] = member;
      party.updated_at = new Date().toISOString();
      XmppService.parties[partyId] = party;

      party.members.forEach((member) => {
        const client = XmppService.clients.find((c) => c.accountId === member.account_id);

        if (!client) {
          logger.debug("why do you not work retard");
          return;
        }

        client.socket.send(
          xmlbuilder
            .create("message")
            .attribute("xmlns", "jabber:client")
            .attribute("to", client.jid)
            .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
            .element(
              "body",
              JSON.stringify({
                account_id: accountId,
                account_dn: member.meta["urn:epic:member:dn_s"],
                member_state_updated: body.update,
                member_state_removed: body.delete,
                member_state_overridden: {},
                party_id: party.id,
                updated_at: new Date().toISOString(),
                sent: new Date().toISOString(),
                revision: member.revision,
                ns: "Fortnite",
                type: "com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED",
              }),
            )
            .up()
            .toString(),
        );
      });

      return c.body(null, 200);
    },
  );

  app.delete(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId",
    Validation.verifyToken,
    async (c) => {
      const partyId = c.req.param("partyId");
      const accountId = c.req.param("accountId");
      const timestamp = new Date().toISOString();
      const party = XmppService.parties[partyId];

      if (!party) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party with the id '${partyId}' does not exist.`,
            timestamp,
          ),
          400,
        );
      }

      const memberIndex = party.members.findIndex((member) => member.account_id === accountId);

      if (memberIndex === -1) {
        const timestamp = new Date().toISOString();
        return c.json(errors.createError(404, c.req.url, "Member not found.", timestamp), 404);
      }

      const member = party.members[memberIndex];

      if (c.get("user").accountId !== accountId && !member.captain) {
        return c.json(errors.createError(403, c.req.url, "User not authorized.", timestamp), 403);
      }

      const removedMember = party.members[memberIndex];

      party.members.splice(memberIndex, 1);
      party.revision++;
      party.updated_at = new Date().toISOString();
      XmppService.parties[partyId] = party;

      party.members.forEach((member) => {
        const client = XmppService.clients.find((cl) => cl.accountId === member.account_id);

        if (!client) return;

        client.socket.send(
          xmlbuilder
            .create("message")
            .attribute("xmlns", "jabber:client")
            .attribute("to", client.jid)
            .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
            .element(
              "body",
              JSON.stringify({
                account_id: removedMember.account_id,
                party_id: party.id,
                kicked: true,
                updated_at: new Date().toISOString(),
                sent: new Date().toISOString(),
                revision: party.revision,
                ns: "Fortnite",
                type: "com.epicgames.social.party.notification.v0.MEMBER_LEFT",
              }),
            )
            .up()
            .toString(),
        );
      });

      if (party.members.length === 0) {
        delete XmppService.parties[partyId];
      }

      const assignmentKey = party.meta["Default:RawSquadAssignments_j"] || "RawSquadAssignments_j";

      if (party.meta[assignmentKey]) {
        const rawSquadAssignment = JSON.parse(party.meta[assignmentKey]);
        const index = rawSquadAssignment.RawSquadAssignments.findIndex(
          (a: any) => a.memberId === accountId,
        );

        if (index !== -1) {
          rawSquadAssignment.RawSquadAssignments.splice(index, 1);
          party.meta[assignmentKey] = JSON.stringify(rawSquadAssignment);
        }

        let captain = party.members.find((member) => member.captain === "CAPTAIN");

        if (!captain) {
          captain = party.members[0];
          if (captain) {
            captain.role = "CAPTAIN";
          }
        }

        party.updated_at = new Date().toISOString();
        XmppService.parties[partyId] = party;

        party.members.forEach((member) => {
          const client = XmppService.clients.find((cl) => cl.accountId === member.account_id);
          if (client) {
            const message = {
              captain_id: captain?.account_id || "",
              created_at: party.created_at,
              invite_ttl_seconds: 14400,
              max_number_of_members: 16,
              ns: "Fortnite",
              party_id: party.id,
              party_privacy_type: party.config.joinability,
              party_state_overriden: {},
              party_state_removed: [],
              party_state_updated: {
                [assignmentKey]: party.meta[assignmentKey],
              },
              party_sub_type: party.meta["urn:epic:cfg:party-type-id_s"],
              party_type: "DEFAULT",
              revision: party.revision,
              sent: new Date().toISOString(),
              type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
              updated_at: new Date().toISOString(),
            };

            client.socket.send(
              xmlbuilder
                .create("message")
                .attribute("xmlns", "jabber:client")
                .attribute("to", client.jid)
                .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
                .element("body", JSON.stringify(message))
                .up()
                .toString(),
            );
          }
        });
      }

      return c.body(null, 200);
    },
  );

  app.post(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId/join",
    Validation.verifyToken,
    async (c) => {
      const { partyId, accountId } = c.req.param();
      const party = XmppService.parties[partyId];
      if (!party) {
        const timestamp = new Date().toISOString();
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party with the id '${partyId}' does not exist.`,
            timestamp,
          ),
          400,
        );
      }

      const { meta: memberMeta, connection: connectionInfo } = await c.req.json();
      const memberId = (connectionInfo.id || "").split("@prod")[0];
      const currentTimestamp = new Date().toISOString();

      party.members = party.members.filter((member) => member.account_id !== accountId);

      party.members.push({
        account_id: connectionInfo.id.split("@")[0],
        meta: memberMeta,
        connections: [
          {
            id: connectionInfo.id,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            yield_leadership: false,
            meta: connectionInfo.meta,
          },
        ],
        revision: 0,
        updated_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        role: "MEMBER",
      });

      const squadAssignmentsKey = party.meta["Default:RawSquadAssignments_j"]
        ? "Default:RawSquadAssignments_j"
        : "RawSquadAssignments_j";
      const squadAssignments = JSON.parse(
        party.meta[squadAssignmentsKey] || '{"RawSquadAssignments":[]}',
      );
      squadAssignments.RawSquadAssignments.push({
        memberId,
        absoluteMemberIdx: party.members.length - 1,
      });
      party.meta[squadAssignmentsKey] = JSON.stringify(squadAssignments);
      party.revision++;
      party.updated_at = currentTimestamp;

      XmppService.parties[partyId] = party;

      const partyCaptain = party.members.find((member) => member.role === "CAPTAIN");

      party.members.forEach((member) => {
        const client = XmppService.clients.find((cl: any) => cl.accountId === member.account_id);

        if (!client?.socket) return;

        const { socket } = client;
        const notifications = [
          {
            type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
            body: {
              account_dn: connectionInfo.meta["urn:epic:member:dn_s"],
              account_id: memberId,
              connection: {
                connected_at: currentTimestamp,
                id: connectionInfo.id,
                meta: connectionInfo.meta,
                updated_at: currentTimestamp,
              },
              joined_at: currentTimestamp,
              member_state_updated: memberMeta || {},
              ns: "Fortnite",
              party_id: party.id,
              revision: 0,
              sent: currentTimestamp,
              type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
              updated_at: currentTimestamp,
            },
          },
          {
            type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
            body: {
              captain_id: partyCaptain?.account_id,
              created_at: party.created_at,
              invite_ttl_seconds: 14400,
              max_number_of_members: 16,
              ns: "Fortnite",
              party_id: party.id,
              party_privacy_type: "PUBLIC",
              party_state_overriden: {},
              party_state_removed: [],
              party_state_updated: { [squadAssignmentsKey]: JSON.stringify(squadAssignments) },
              party_sub_type: "default",
              party_type: "DEFAULT",
              revision: party.revision,
              sent: currentTimestamp,
              type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
              updated_at: currentTimestamp,
            },
          },
        ];

        notifications.forEach((notification) => {
          socket.send(
            xmlbuilder
              .create("message")
              .attribute("xmlns", "jabber:client")
              .attribute("to", client.jid)
              .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
              .element("body", JSON.stringify(notification.body))
              .up()
              .toString(),
          );
        });
      });

      return c.json({ status: "JOINED", party_id: party.id });
    },
  );

  app.post(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId/promote",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const partyId = c.req.param("partyId");
      const timestamp = new Date().toISOString();

      const party = XmppService.parties[partyId];

      if (!party) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party with the id '${partyId}' does not exist.`,
            timestamp,
          ),
          400,
        );
      }

      const captainIndex = party.members.findIndex((member) => member.role === "CAPTAIN");
      const newCaptainIndex = party.members.findIndex((member) => member.account_id === accountId);

      if (newCaptainIndex === -1) {
        return c.json(errors.createError(404, c.req.url, "Member not found.", timestamp), 404);
      }

      if (captainIndex !== -1) {
        party.members[captainIndex].role = "MEMBER";
      }

      party.members[newCaptainIndex].role = "CAPTAIN";
      party.updated_at = timestamp;
      XmppService.parties[partyId] = party;

      party.members.forEach((member) => {
        const client = XmppService.clients.find((cl) => cl.accountId === member.account_id);

        if (client) {
          client.socket.send(
            xmlbuilder
              .create("message")
              .attribute("xmlns", "jabber:client")
              .attribute("to", client.jid)
              .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
              .element(
                "body",
                JSON.stringify({
                  account_id: accountId,
                  member_state_update: {},
                  ns: "Fortnite",
                  party_id: party.id,
                  revision: party.revision || 0,
                  sent: timestamp,
                  type: "com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN",
                }),
              )
              .up()
              .toString(),
          );
        }
      });

      return c.body(null, 200);
    },
  );

  app.post(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId",
    Validation.verifyToken,
    async (c) => {
      const { accountId, pingerId } = c.req.param();
      const useragent = c.req.header("User-Agent");
      const timestamp = new Date().toISOString();

      if (!useragent) {
        return c.json(
          errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
          400,
        );
      }

      const uahelper = uaparser(useragent);
      if (!uahelper) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
          400,
        );
      }

      const pingIndex = XmppService.pings.findIndex(
        (p) => p.sent_to === accountId && p.sent_by === pingerId,
      );
      if (pingIndex !== -1) {
        XmppService.pings.splice(pingIndex, 1);
      }

      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 1);

      const newPing = {
        sent_by: pingerId,
        sent_to: accountId,
        sent_at: timestamp,
        expires_at: expirationTime.toISOString(),
        meta: {},
      };
      XmppService.pings.push(newPing);

      const user = await userService.findUserByAccountId(pingerId);
      if (!user) {
        return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);
      }

      SendMessageToId(
        accountId,
        JSON.stringify({
          expires: newPing.expires_at,
          meta: {},
          ns: "Fortnite",
          pinger_dn: user.username,
          pinger_id: pingerId,
          sent: newPing.sent_at,
          version: uahelper.season,
          type: "com.epicgames.social.party.notification.v0.PING",
        }),
      );

      return c.json(newPing);
    },
  );

  app.delete(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId",
    Validation.verifyToken,
    async (c) => {
      const { accountId, pingerId } = c.req.param();

      const pingIndex = XmppService.pings.findIndex(
        (ping) => ping.sent_to === accountId && ping.sent_by === pingerId,
      );

      if (pingIndex !== -1) {
        XmppService.pings.splice(pingIndex, 1);
      }

      return c.body(null, 200);
    },
  );

  app.get(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/parties",
    Validation.verifyToken,
    async (c) => {
      const { accountId, pingerId } = c.req.param();

      let queriedPings = XmppService.pings.filter(
        (ping) => ping.sent_to === accountId && ping.sent_by === pingerId,
      );
      if (queriedPings.length === 0) {
        queriedPings = [{ sent_by: pingerId }];
      }

      const parties = Object.values(XmppService.parties);
      const result = queriedPings
        .map((ping) => {
          const party = parties.find((party) =>
            party.members.some((member) => member.account_id === ping.sent_by),
          );

          return party
            ? {
                id: party.id,
                created_at: party.created_at,
                updated_at: party.updated_at,
                config: party.config,
                members: party.members,
                applicants: [],
                meta: party.meta,
                invites: [],
                revision: party.revision || 0,
              }
            : null;
        })
        .filter((party) => party !== null);

      return c.json(result);
    },
  );

  app.post(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/join",
    Validation.verifyToken,
    async (c) => {
      const { accountId, pingerId } = c.req.param();
      const { connection, meta } = await c.req.json();

      let ping = XmppService.pings.find((p) => p.sent_to === accountId && p.sent_by === pingerId);
      if (!ping) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `No ping found for '${accountId}' from '${pingerId}'.`,
            new Date().toISOString(),
          ),
          400,
        );
      }

      const newParty = Object.values(XmppService.parties).find((party) =>
        party.members.some((member) => member.account_id === ping.sent_by),
      );

      if (!newParty) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party not found for ping '${ping.sent_by}'.`,
            new Date().toISOString(),
          ),
          400,
        );
      }

      const isAlreadyMember = newParty.members.some((member) => member.account_id === accountId);
      if (isAlreadyMember) {
        return c.json({ status: "JOINED", party_id: newParty.id });
      }

      const connectionId = (connection.id || "").split("@prod")[0];
      const newMember: PartyMember = {
        account_id: accountId,
        meta: meta || {},
        connections: [
          {
            id: connection.id || "",
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            yield_leadership: !!connection.yield_leadership,
            meta: connection.meta || {},
          },
        ],
        revision: 0,
        updated_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        role: connection.yield_leadership ? "CAPTAIN" : "MEMBER",
      };

      newParty.members.push(newMember);
      newParty.updated_at = new Date().toISOString();
      XmppService.parties[newParty.id] = newParty;

      const sendJoinNotification = (member: PartyMember) => {
        SendMessageToId(
          JSON.stringify({
            account_dn: connection.meta["urn:epic:member:dn_s"],
            account_id: connectionId,
            connection: {
              connected_at: new Date().toISOString(),
              id: connection.id,
              meta: connection.meta,
              updated_at: new Date().toISOString(),
            },
            joined_at: new Date().toISOString(),
            member_state_updated: meta || {},
            ns: "Fortnite",
            party_id: newParty.id,
            revision: newParty.revision || 0,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
            updated_at: new Date().toISOString(),
          }),
          member.account_id,
        );
      };

      newParty.members.forEach(sendJoinNotification);

      return c.json({ status: "JOINED", party_id: newParty.id });
    },
  );
}
