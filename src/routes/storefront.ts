import { app, config, itemStorageService, userService } from "..";
import axios from "axios";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import { ShopGenerator } from "../shop/shop";
import { ShopHelper } from "../shop/helpers/shophelper";

export default function () {
  app.get("/fortnite/api/storefront/v2/keychain", async (c) => {
    const keychainResponse = await axios.get("https://api.nitestats.com/v1/epic/keychain");
    return c.json(keychainResponse.data);
  });

  // Cache for storefront data to prevent constant refreshing
  let storefrontCache = {
    data: null,
    timestamp: 0,
    expiresIn: 60000 // Cache expires after 1 minute
  };

  app.get("/fortnite/api/storefront/v2/catalog", async (c) => {
    const timestamp = new Date().toISOString();
    const useragent = c.req.header("User-Agent");

    if (!useragent)
      return c.json(
        errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
        400,
      );

    const uahelper = uaparser(useragent);

    if (!uahelper)
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );

    if (uahelper.season === 0) return c.json({});
    
    // Check if we have a valid cache
    const currentTime = Date.now();
    if (storefrontCache.data && currentTime - storefrontCache.timestamp < storefrontCache.expiresIn) {
      // Return cached data if it's still valid
      if (uahelper.season === config.currentSeason) {
        return c.json(storefrontCache.data);
      } else {
        return c.json([]);
      }
    }

    // If no valid cache, fetch fresh data
    const [storefrontData] = await Promise.all([itemStorageService.getItemByType("storefront")]);

    if (!storefrontData)
      return c.json(
        errors.createError(400, c.req.url, "Failed to get current storefront.", timestamp),
        400,
      );

    // Update cache
    storefrontCache.data = storefrontData.data;
    storefrontCache.timestamp = currentTime;

    if (uahelper.season === config.currentSeason) {
      return c.json(storefrontData.data);
    } else {
      return c.json([]);
    }
  });

  app.get("/catalog/api/shared/bulk/offers", async (c) => {
    return c.json([]);
  });
}
