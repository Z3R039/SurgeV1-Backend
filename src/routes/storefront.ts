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

    const [storefrontData] = await Promise.all([itemStorageService.getItemByType("storefront")]);

    if (!storefrontData)
      return c.json(
        errors.createError(400, c.req.url, "Failed to get current storefront.", timestamp),
        400,
      );

    // const ProfileRevisions = c.req.header("X-Epic-ProfileRevisions");

    // if (!ProfileRevisions)
    //   return c.json(
    //     errors.createError(
    //       400,
    //       c.req.url,
    //       "header 'X-Epic-ProfileRevisions' is missing.",
    //       timestamp,
    //     ),
    //     400,
    //   );

    // const revisions = JSON.parse(ProfileRevisions);

    // const clientCommandRevision = revisions.find(
    //   (rev: any) => rev.profileId === "athena",
    // ).clientCommandRevision;

    // if (!clientCommandRevision) {
    //   return c.json(
    //     errors.createError(
    //       400,
    //       c.req.url,
    //       "Failed to get clientCommandRevision from X-Epic-ProfileRevisions.",
    //       timestamp,
    //     ),
    //     400,
    //   );
    // }

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
