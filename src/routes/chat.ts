import { app, userService } from "..";
import errors from "../utilities/errors";

export default function () {
  app.post(
    "/fortnite/api/game/v2/chat/:accountId/recommendGeneralChatRooms/:gameType/pc",
    async (c) => {
      const gameType = c.req.param("gameType");
      const accountId = c.req.param("accountId");

      if (!accountId) {
        return c.json(
          errors.createError(400, c.req.url, "Account ID is required.", new Date().toISOString()),
        );
      }

      const user = await userService.findUserByAccountId(accountId);

      if (!user) {
        return c.json(
          errors.createError(
            404,
            c.req.url,
            `User with account ID ${accountId} not found.`,
            new Date().toISOString(),
          ),
        );
      }

      switch (gameType) {
        case "private":
          return c.json({
            globalChatRooms: [
              {
                roomName: "fortnite",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            founderChatRooms: [
              {
                roomName: "founder",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            bNeedsPaidAccessForGlobalChat: false,
            bNeedsPaidAccessForFounderChat: false,
            bIsGlobalChatDisabled: false,
            bIsFounderChatDisabled: false,
            bIsSubGameGlobalChatDisabled: false,
          });
        case "public":
          return c.json({
            globalChatRooms: [
              {
                roomName: "fortnite",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            founderChatRooms: [
              {
                roomName: "founder",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            bNeedsPaidAccessForGlobalChat: false,
            bNeedsPaidAccessForFounderChat: false,
            bIsGlobalChatDisabled: false,
            bIsFounderChatDisabled: false,
            bIsSubGameGlobalChatDisabled: false,
          });
        default:
          return c.json({
            globalChatRooms: [
              {
                roomName: "fortnite",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            founderChatRooms: [
              {
                roomName: "founder",
                currentMembersCount: 0,
                maxMembersCount: 9999,
                publicFacingShardName: "",
              },
            ],
            bNeedsPaidAccessForGlobalChat: false,
            bNeedsPaidAccessForFounderChat: false,
            bIsGlobalChatDisabled: false,
            bIsFounderChatDisabled: false,
            bIsSubGameGlobalChatDisabled: false,
          });
      }
    },
  );
}
