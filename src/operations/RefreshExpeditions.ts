import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, logger, profilesService, userService } from "..";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();

  if (!useragent) {
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );
  }

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );
    }

    const body = await c.req.json();

    if (!body) {
      return c.json(errors.createError(400, c.req.url, "Missing body.", timestamp), 400);
    }

    // TODO: Implement refresh expeditions

    return c.json(MCPResponses.generate(profile, [], profileId));
  } catch (error) {
    logger.error(`RefreshExpeditions: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
