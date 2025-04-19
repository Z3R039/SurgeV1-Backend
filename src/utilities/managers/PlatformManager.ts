import type { Context } from "hono";
import errors from "../errors";

export default class PlatformManager {
  /**
   * Gets the corresponding platform for the given platform.
   * @param platform The platform to get the corresponding platform for.
   * @returns The corresponding platform for the given platform.
   */
  static getPlatform(platform: string): string {
    switch (platform) {
      case "IOS":
        return "IOSAppStore";
      case "Android":
        return "EpicAndroid";
      case "Windows":
        return "EpicPC";
      case "PlayStation":
        return "PSN";

      default:
        return "Unknown";
    }
  }

  static parseUserAgent(useragent: string) {
    const parts = useragent.split(" ");

    for (const part of parts) {
      const platformData = part.split("/");

      console.log(platformData);

      if (platformData.length === 2) {
        return platformData[0];
      }
    }

    return null;
  }

  /**
   * Gets the corresponding platform for the given user agent.
   * @param c The context of the request.
   * @returns The corresponding platform for the given user agent.
   */
  static getClientPlatformByUserAgent(c: Context) {
    const useragent = c.req.header("User-Agent");
    const date = new Date();

    if (!useragent) {
      return c.json(
        errors.createError(400, c.req.url, "header 'User-Agent' is missing.", date.toISOString()),
        400,
      );
    }

    let Platform = useragent.split(" ")[1].split("/")[0] as string;

    switch (Platform) {
      case "Cert":
      case "Live":
        Platform = "Windows";
        break;

      default:
        Platform = Platform.split(" ")[0];
        break;
    }

    return Platform;
  }
}
