import { v4 as uuid } from "uuid";
import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class CollectionBookSchematicsProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = CollectionBookSchematicsProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  static createProfile(accountId: string): IProfile {
    return {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 0,
      wipeNumber: 1,
      _id: uuid(),
      accountId,
      profileId: "collection_book_schematics0",
      version: "no_version",
      items: CollectionBookSchematicsProfile.createInitialItems(),
      stats: CollectionBookSchematicsProfile.createInitialStats(),
      commandRevision: 0,
    };
  }

  getProfile(): IProfile {
    return this.profile;
  }

  /**
   * Creates the initial stats for the CollectionBookSchematicsProfile.
   * @returns {object} - The initial stats object with basic attributes.
   */
  static createInitialStats(): { attributes: object } {
    return {
      attributes: {
        inventory_limit_bonus: 0,
      },
    };
  }

  /**
   * Creates the initial items for the CollectionBookSchematicsProfile.
   * Each item is assigned a random UUID as its key, and attributes are initialized with section states and active state.
   * @returns {object} - An object representing the initial collection book items.
   */
  static createInitialItems(): {
    [key: string]: {
      templateId: string;
      attributes: object;
      quantity: number;
    };
  } {
    const itemTemplates = [
      "CollectionBookPage:pageMelee_Axes_Weapons",
      "CollectionBookPage:pageMelee_Axes_Weapons_Crystal",
      "CollectionBookPage:pageMelee_Clubs_Weapons",
      "CollectionBookPage:pageMelee_Clubs_Weapons_Crystal",
      "CollectionBookPage:pageMelee_Scythes_Weapons",
      "CollectionBookPage:pageMelee_Scythes_Weapons_Crystal",
      "CollectionBookPage:pageMelee_Spears_Weapons",
      "CollectionBookPage:pageMelee_Spears_Weapons_Crystal",
      "CollectionBookPage:pageMelee_Swords_Weapons",
      "CollectionBookPage:pageMelee_Swords_Weapons_Crystal",
      "CollectionBookPage:pageMelee_Tools_Weapons",
      "CollectionBookPage:pageMelee_Tools_Weapons_Crystal",
      "CollectionBookPage:pageRanged_Assault_Weapons",
      "CollectionBookPage:pageRanged_Assault_Weapons_Crystal",
      "CollectionBookPage:pageRanged_Shotgun_Weapons",
      "CollectionBookPage:pageRanged_Shotgun_Weapons_Crystal",
      "CollectionBookPage:page_Ranged_Pistols_Weapons",
      "CollectionBookPage:page_Ranged_Pistols_Weapons_Crystal",
      "CollectionBookPage:pageRanged_Snipers_Weapons",
      "CollectionBookPage:pageRanged_Snipers_Weapons_Crystal",
      "CollectionBookPage:pageRanged_Explosive_Weapons",
      "CollectionBookPage:pageTraps_Wall",
      "CollectionBookPage:pageTraps_Ceiling",
      "CollectionBookPage:pageTraps_Floor",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_Medieval",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_Medieval_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_Melee_Medieval",
      "CollectionBookPage:PageSpecial_Weapons_Melee_Medieval_Crystal",
      "CollectionBookPage:PageSpecial_Winter2017_Weapons",
      "CollectionBookPage:PageSpecial_Winter2017_Weapons_Crystal",
      "CollectionBookPage:PageSpecial_RatRod_Weapons",
      "CollectionBookPage:PageSpecial_RatRod_Weapons_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_Winter2017",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_Winter2017_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_Melee_Winter2017",
      "CollectionBookPage:PageSpecial_Weapons_Melee_Winter2017_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_ChineseNewYear2018",
      "CollectionBookPage:PageSpecial_Weapons_Crystal_ChineseNewYear2018",
      "CollectionBookPage:PageSpecial_StormZoneCyber_Ranged",
      "CollectionBookPage:PageSpecial_StormZoneCyber_Melee",
      "CollectionBookPage:PageSpecial_StormZoneCyber_Ranged_Crystal",
      "CollectionBookPage:PageSpecial_StormZoneCyber_Melee_Crystal",
      "CollectionBookPage:PageSpecial_Blockbuster2018_Ranged",
      "CollectionBookPage:PageSpecial_Blockbuster2018_Ranged_Crystal",
      "CollectionBookPage:PageSpecial_RoadTrip2018_Weapons",
      "CollectionBookPage:PageSpecial_RoadTrip2018_Weapons_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_StormZone2",
      "CollectionBookPage:PageSpecial_Weapons_Ranged_StormZone2_Crystal",
      "CollectionBookPage:PageSpecial_Weapons_Melee_StormZone2",
      "CollectionBookPage:PageSpecial_Weapons_Melee_StormZone2_Crystal",
      "CollectionBookPage:PageSpecial_Hydraulic",
      "CollectionBookPage:PageSpecial_Hydraulic_Crystal",
      "CollectionBookPage:PageSpecial_Scavenger",
      "CollectionBookPage:PageSpecial_Scavenger_Crystal",
      "CollectionBookPage:test_TestPage",
    ];

    const initialItems: Record<string, any> = {};

    itemTemplates.forEach((templateId) => {
      initialItems[uuid()] = {
        templateId,
        attributes: { sectionStates: [], state: "Active" },
        quantity: 1,
      };
    });

    return initialItems;
  }
}
