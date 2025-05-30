import { app, config, logger, tokensService, userService } from "..";
import { User } from "../tables/user";
import errors from "../utilities/errors";
import TokenUtilities from "../utilities/tokens";
import { v4 as uuid } from "uuid";
import jwt, { decode, type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";
import uaparser from "../utilities/uaparser";
import { sign } from "hono/jwt";
import internal from "node:stream";

// Version restriction configuration from environment settings
const versionRestriction = {
  // Enable/disable version restriction
  bEnableOnlyOneVersionJoinable: config.enableVersionRestriction,
  // The version that is allowed to join (can be a specific version like 9.10)
  bVersionJoinable: config.versionJoinable
};

export function validateBase64(input: string) {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(input);
}

export async function updateHwid(user: User, deviceId: string): Promise<void> {
  await User.createQueryBuilder()
    .update(User)
    .set({ hwid: deviceId })
    .where("accountId = :accountId", { accountId: user.accountId })
    .execute();
}

export function validateHWID(hwid: string): boolean {
  const hwidRegex = /^[0-9a-fA-F]{32}$/;

  return typeof hwid === "string" && hwidRegex.test(hwid);
}

export default function () {
  app.post("/account/api/oauth/token", async (c) => {
    const tokenHeader = c.req.header("Authorization");
    const timestamp = new Date().toISOString();
    const uahelper = uaparser(c.req.header("User-Agent"));

    if (!tokenHeader)
      return c.json(errors.createError(400, c.req.url, "Invalid Headers.", timestamp), 400);

    const token = tokenHeader.split(" ");

    if (token.length !== 2 || !validateBase64(token[1]))
      return c.json(errors.createError(400, c.req.url, "Invalid base64", timestamp));

    let body;

    try {
      body = await c.req.parseBody();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Invalid body.", timestamp), 400);
    }

    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    // NOTE: Eventually will implement hardware id getting throguh a client dll.

    const blacklistedSeasons = new Set([1, 2, 3, 4, 5, 6, 7]);
    let deviceId = null;
    const isSeasonBlacklisted = blacklistedSeasons.has(uahelper.season);
    
    // Check if version restriction is enabled and if the client version is allowed
    if (versionRestriction.bEnableOnlyOneVersionJoinable && uahelper.season !== versionRestriction.bVersionJoinable) {
      return c.json(
        errors.createError(
          403, 
          c.req.url, 
          `This server only allows version ${versionRestriction.bVersionJoinable} to join. Your version: ${uahelper.season}`, 
          timestamp
        ), 
        403
      );
    }

    if (!isSeasonBlacklisted) {
      deviceId = c.req.header("X-Epic-Device-ID") || c.req.header("HWID");
    }

    let { grant_type } = body;

    const clientId: string = Buffer.from(token[1], "base64").toString().split(":")[0];

    if (!clientId)
      return c.json(errors.createError(400, c.req.url, "Invalid client.", timestamp), 400);

    if (!isSeasonBlacklisted) {
      if (!deviceId)
        return c.json(errors.createError(400, c.req.url, "No 'HWID' provided.", timestamp), 400);

      if (!validateHWID(deviceId))
        return c.json(errors.createError(400, c.req.url, "Invalid HWID format.", timestamp), 400);
    }

    let user: User | null;

    if (!isSeasonBlacklisted) {
      const userByHWID = await userService.findUserByHWID(deviceId as string);

      if (userByHWID && userByHWID.banned)
        return c.json(errors.createError(403, c.req.url, "This user is banned.", timestamp), 403);

      const updateHwidIfNeeded = async () => {
        if (userByHWID || !userByHWID) await updateHwid(user!, deviceId as string);
        if (user!.banned && userByHWID && userByHWID?.banned) {
          await updateHwid(user!, deviceId as string);
          return c.json(
            errors.createError(403, c.req.url, "This user is currently banned.", timestamp),
            403,
          );
        }
      };

      switch (grant_type) {
        case "password":
          const { username, password } = body;

          if (!password || !username)
            return c.json(
              errors.createError(400, c.req.url, "username or password is missing.", timestamp),
              400,
            );

          user = await userService.findUserByEmail(username as string);

          if (!user)
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );

          if (user.banned)
            return c.json(
              errors.createError(403, c.req.url, "This user is banned.", timestamp),
              403,
            );

          if (!(await Bun.password.verify(password as string, user.password)))
            return c.json(
              errors.createError(400, c.req.url, "Invalid account credentials.", timestamp),
              400,
            );

          await updateHwidIfNeeded();
          break;

        case "client_credentials":
          const token = jwt.sign(
            {
              p: crypto.randomBytes(128).toString("base64"),
              clsvc: "fortnite",
              t: "s",
              mver: false,
              clid: clientId,
              ic: true,
              exp: Math.floor(Date.now() / 1000) + 240 * 240,
              am: "client_credentials",
              iat: Math.floor(Date.now() / 1000),
              jti: crypto.randomBytes(32).toString("hex"),
              creation_date: new Date().toISOString(),
              expires_in: 1,
            },
            config.client_secret,
          );

          return c.json({
            access_token: `eg1~${token}`,
            expires_in: 3600,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            token_type: "bearer",
            client_id: clientId,
            internal_client: true,
            client_service: "fortnite",
          });

        case "exchange_code":
          const { exchange_code } = body;

          if (!exchange_code)
            return c.json(
              errors.createError(400, c.req.url, "Missing body 'exchange_code'", timestamp),
              400,
            );

          const userToken = jwt.verify(exchange_code as string, config.client_secret) as JwtPayload;

          if (!userToken)
            return c.json(errors.createError(404, c.req.url, "Invalid Token.", timestamp), 404);

          user = await userService.findUserByAccountId(userToken.sub as string);

          if (!user)
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );

          await updateHwidIfNeeded();
          break;

        case "refresh_token":
          const { refresh_token } = body;

          if (!refresh_token)
            return c.json(
              errors.createError(400, c.req.url, "Missing body 'refresh_token'", timestamp),
              400,
            );

          const cleanedRefreshToken = refresh_token.toString().replace("eg1~", "");

          const refreshToken = await tokensService.getToken(cleanedRefreshToken);
          if (!refreshToken)
            return c.json(
              errors.createError(400, c.req.url, "Invalid Refresh Token.", timestamp),
              400,
            );

          user = await userService.findUserByAccountId(refreshToken.accountId);
          if (!user)
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );

          await updateHwidIfNeeded();
          break;

        default:
          logger.warn(`Missing GrantType: ${grant_type}`);
          return c.json(errors.createError(400, c.req.url, "Invalid Grant.", timestamp), 400);
      }
    } else {
      switch (grant_type) {
        case "password":
          const { username, password } = body;

          if (!password || !username)
            return c.json(
              errors.createError(400, c.req.url, "username or password is missing.", timestamp),
              400,
            );

          user = await userService.findUserByEmail(username as string);

          if (!user)
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );

          if (user.banned)
            return c.json(
              errors.createError(403, c.req.url, "This user is banned.", timestamp),
              403,
            );

          if (!(await Bun.password.verify(password as string, user.password)))
            return c.json(
              errors.createError(400, c.req.url, "Invalid account credentials.", timestamp),
              400,
            );
          break;

        case "client_credentials":
          const token = jwt.sign(
            {
              p: crypto.randomBytes(128).toString("base64"),
              clsvc: "fortnite",
              t: "s",
              mver: false,
              clid: clientId,
              ic: true,
              exp: Math.floor(Date.now() / 1000) + 240 * 240,
              am: "client_credentials",
              iat: Math.floor(Date.now() / 1000),
              jti: crypto.randomBytes(32).toString("hex"),
              creation_date: new Date().toISOString(),
              expires_in: 1,
            },
            config.client_secret,
          );

          return c.json({
            access_token: `eg1~${token}`,
            expires_in: 3600,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            token_type: "bearer",
            client_id: clientId,
            internal_client: true,
            client_service: "fortnite",
          });

        case "exchange_code":
          const { exchange_code } = body;

          if (!exchange_code)
            return c.json(
              errors.createError(400, c.req.url, "Missing body 'exchange_code'", timestamp),
              400,
            );

          const exchangeCode = await tokensService.getToken(exchange_code as string);

          if (!exchangeCode) {
            return c.json(
              errors.createError(400, c.req.url, "Invalid Exchange Code.", timestamp),
              400,
            );
          }

          const userByAccountId = await userService.findUserByAccountId(exchangeCode.accountId);
          if (!userByAccountId) {
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );
          }

          user = userByAccountId;

          break;

        case "refresh_token":
          const { refresh_token } = body;

          if (!refresh_token)
            return c.json(
              errors.createError(400, c.req.url, "Missing body 'refresh_token'", timestamp),
              400,
            );

          const cleanedRefreshToken = refresh_token.toString().replace("eg1~", "");

          const refreshToken = await tokensService.getToken(cleanedRefreshToken);
          if (!refreshToken)
            return c.json(
              errors.createError(400, c.req.url, "Invalid Refresh Token.", timestamp),
              400,
            );

          user = await userService.findUserByAccountId(refreshToken.accountId);
          if (!user)
            return c.json(
              errors.createError(404, c.req.url, "Failed to find user.", timestamp),
              404,
            );
          break;

        default:
          logger.warn(`Missing GrantType: ${grant_type}`);
          return c.json(errors.createError(400, c.req.url, "Invalid Grant.", timestamp), 400);
      }
    }

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    if (!isSeasonBlacklisted) {
      const userByHWID = await userService.findUserByHWID(deviceId as string);
      if (userByHWID || !userByHWID) await updateHwid(user, deviceId as string);
      if (user.banned && userByHWID && userByHWID?.banned) {
        await updateHwid(user, deviceId as string);
        return c.json(
          errors.createError(403, c.req.url, "This user is currently banned.", timestamp),
          403,
        );
      }
    }

    await tokensService.deleteByType(user.accountId, "accesstoken");
    await tokensService.deleteByType(user.accountId, "refreshtoken");

    const accessToken = await TokenUtilities.createAccessToken(
      clientId,
      grant_type as string,
      user,
    );
    const refreshToken = await TokenUtilities.createRefreshToken(clientId, user);

    return c.json({
      access_token: `eg1~${accessToken}`,
      expires_in: 3600,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      token_type: "bearer",
      account_id: user.accountId,
      client_id: clientId,
      internal_client: true,
      client_service: "fortnite",
      refresh_token: `eg1~${refreshToken}`,
      refresh_expires: 86400,
      refresh_expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
      displayName: user.username,
      app: "fortnite",
      in_app_id: user.accountId,
      device_id: deviceId,
    });
  });

  app.delete("/account/api/oauth/sessions/kill/:token", async (c) => {
    const token = c.req.param("token");
    const Authorization = c.req.header("Authorization");
    const timestamp = new Date().toISOString();

    if (!token)
      return c.json(
        errors.createError(400, c.req.url, "Parameter 'token' is missing.", timestamp),
        400,
      );

    if (!Authorization)
      return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);

    const decodedToken = jwt.verify(token.replace("eg1~", ""), config.client_secret) as JwtPayload;

    if (typeof decodedToken === "string" || !decodedToken)
      return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);

    const user = await userService.findUserByAccountId(decodedToken.sub as string);

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    await tokensService.getTokenByTypeAndAccountId("accesstoken", user.accountId);
    await tokensService.getTokenByTypeAndAccountId("refreshtoken", user.accountId);

    return c.body(null, 200);
  });

  app.post("/account/api/oauth/createExchangeCode", async (c) => {
    const timestamp = new Date().toISOString();

    const body = await c.req.json();

    if (!body) {
      logger.error(`Invalid 'body': ${body}`);
      return c.json(errors.createError(400, c.req.url, "'body' is missing.", timestamp), 400);
    }

    if (!body.accountId) {
      logger.error(`Invalid 'accountId': ${body.accountId}`);
      return c.json(errors.createError(400, c.req.url, "'accountId' is missing.", timestamp), 400);
    }

    if (body.endpointAccessToken !== config.client_secret) {
      logger.error(`Invalid 'accessToken': ${body.endpointAccessToken}`);
      return c.json(errors.createError(400, c.req.url, "Invalid 'accessToken'.", timestamp), 400);
    }

    await tokensService.create(
      {
        type: "exchangecode",
        accountId: body.accountId,
        token: uuid().replace(/-/g, ""),
        clientId: "",
        grant: "exchange_code",
      },
      body.accountId,
    );

    const code = await tokensService.getTokenByTypeAndAccountId("exchangecode", body.accountId);

    if (!code)
      return c.json(errors.createError(500, c.req.url, "Failed to create token.", timestamp), 500);

    return c.json({
      code: code.token,
    });
  });

  app.get("/account/api/oauth/verify", async (c) => {
    const token: string = c.req.header("Authorization")?.split("bearer ")[1] as string;
    const accessToken = token.replace("eg1~", "");
    const timestamp = new Date().toISOString();

    if (!accessToken)
      return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);

    const decodedToken = jwt.verify(accessToken, config.client_secret) as JwtPayload;

    if (typeof decodedToken === "string" || !decodedToken)
      return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);

    const user = await userService.findUserByAccountId(decodedToken.sub as string);

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    const creationTime = new Date(decodedToken.creation_date).toISOString();
    const expiry = new Date(creationTime + decodedToken.expires_in * 60 * 60 * 1000);

    return c.json({
      token,
      session_id: decodedToken.jti,
      token_type: "bearer",
      client_id: decodedToken.clid,
      internal_client: true,
      client_service: "fortnite",
      account_id: user.accountId,
      expires_in: Math.round((expiry.getTime() - Date.now()) / 1000),
      expires_at: new Date(expiry.getTime() + 8 * 60 * 60 * 1000),
      auth_method: decodedToken.am,
      display_name: user.username,
      app: "fortnite",
      in_app_id: user.accountId,
      device_id: decodedToken.dvid,
    });
  });
}
