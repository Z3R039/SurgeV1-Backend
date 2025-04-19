import { v4 as uuid } from "uuid";
import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class CollectionBookPeopleProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = CollectionBookPeopleProfile.createProfile(accountId);
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
      profileId: "collection_book_people0",
      version: "",
      items: CollectionBookPeopleProfile.createInitialItems(),
      stats: {
        attributes: {
          inventory_limit_bonus: 0,
        },
      },
      commandRevision: 0,
    };
  }

  static createInitialItems(): Record<string, any> {
    const itemTemplates = [
      "CollectionBookPage:pageHeroes_Commando",
      "CollectionBookPage:pageHeroes_Constructor",
      "CollectionBookPage:pageHeroes_Ninja",
      "CollectionBookPage:pageHeroes_Outlander",
      "CollectionBookPage:pagePeople_Defenders",
      "CollectionBookPage:pagePeople_Survivors",
      "CollectionBookPage:pagePeople_Leads",
      "CollectionBookPage:pagePeople_UniqueLeads",
      "CollectionBookPage:PageSpecial_Winter2017_Heroes",
      "CollectionBookPage:PageSpecial_Halloween2017_Heroes",
      "CollectionBookPage:PageSpecial_Halloween2017_Workers",
      "CollectionBookPage:PageSpecial_ChineseNewYear2018_Heroes",
      "CollectionBookPage:PageSpecial_SpringItOn2018_People",
      "CollectionBookPage:PageSpecial_StormZoneCyber_Heroes",
      "CollectionBookPage:PageSpecial_Blockbuster2018_Heroes",
      "CollectionBookPage:PageSpecial_ShadowOps_Heroes",
      "CollectionBookPage:PageSpecial_RoadTrip2018_Heroes",
      "CollectionBookPage:PageSpecial_WildWest_Heroes",
      "CollectionBookPage:PageSpecial_StormZone_Heroes",
      "CollectionBookPage:PageSpecial_Scavenger_Heroes",
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

  getProfile(): IProfile {
    return this.profile;
  }
}
