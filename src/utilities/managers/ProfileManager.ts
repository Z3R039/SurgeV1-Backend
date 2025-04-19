import { logger } from "../..";
import type { IProfile } from "../../../types/profilesdefs";
import type { ProfileId } from "../responses";
import type ProfileBase from "./base/ProfileBase";
import AthenaProfile from "./classes/AthenaProfile";
import CampaignProfile from "./classes/CampaignProfile";
import CollectionBookPeopleProfile from "./classes/CollectionBookPeopleProfile";
import CollectionBookSchematicsProfile from "./classes/CollectionBookSchematicsProfile";
import CollectionsProfile from "./classes/CollectionsProfile";
import CommonCoreProfile from "./classes/CommonCoreProfile";
import CreativeProfile from "./classes/CreativeProfile";
import LoadoutManager from "./classes/loadouts/LoadoutManager";
import MetaDataProfile from "./classes/MetaDataProfile";
import OutpostProfile from "./classes/OutpostProfile";
import TheaterProfile from "./classes/TheaterProfile";

import { v4 as uuid } from "uuid";

const profileClassMap = new Map<ProfileId, new (...args: any[]) => ProfileBase>([
  ["athena", AthenaProfile],
  ["common_core", CommonCoreProfile],
  ["common_public", CommonCoreProfile],
  ["campaign", CampaignProfile],
  ["metadata", MetaDataProfile],
  ["theater0", TheaterProfile],
  ["outpost0", OutpostProfile],
  ["collection_book_schematics0", CollectionBookSchematicsProfile],
  ["collection_book_people0", CollectionBookPeopleProfile],
  ["collections", CollectionsProfile],
  ["creative", CreativeProfile],
]);

export namespace ProfileManager {
  export function createProfile(type: ProfileId, accountId: string): IProfile {
    const ProfileClass = profileClassMap.get(type);

    if (!ProfileClass) {
      logger.warn(`Profile of type ${type} not found.`);
      throw new Error("Profile type not found.");
    }

    if (type === "profile0") {
      const profile = new CampaignProfile(accountId).getProfile();

      profile.stats.templateId = "profile_v2";
      profile.profileId = type;

      return profile;
    }

    return new ProfileClass(accountId).getProfile();
  }
}
