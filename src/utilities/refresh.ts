import fetch from "node-fetch";
import https from "https";
import { config, logger } from "..";

export default async function RefreshAccount(accountId: string, username: string) {
  try {
    const response = await fetch(
      `http://127.0.0.1:${config.port}/fortnite/api/game/v3/profile/${accountId}/client/emptygift`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Fortnite/++Fortnite+Release-10.40-CL-18775446 Windows/10.0.19043.1.256.64bit",
        },
      },
    );

    if (!response.ok) {
      logger.error(`HTTP Error: ${response.status} - ${response.statusText}`);
      return;
    }
  } catch (error) {
    logger.error(`Error: ${error}`);
  }
}
