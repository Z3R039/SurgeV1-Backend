import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";
import { v4 as uuid } from "uuid";

export default class MetaDataProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = MetaDataProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  /**
   * Factory method to create a new profile for MeatData.
   * @param accountId - The account ID associated with the profile.
   * @returns A fully initialized IProfile object.
   */
  static createProfile(accountId: string): IProfile {
    const { defaultItems } = this.createDefaultItmesWithUUIDs();
    const initialStats = this.createInitialStats();
    const profile = this.buildProfileSkeleton(accountId, defaultItems, initialStats);

    return profile;
  }

  /**
   * Builds the skeleton of the profile object with essential fields.
   * @param accountId - The account ID for the profile.
   * @param defaultItems - Predefined default items to initialize the profile.
   * @param initialStats - Initial stats for the profile.
   * @returns A profile object with default fields populated.
   */
  static buildProfileSkeleton(accountId: string, defaultItems: any, initialStats: any): IProfile {
    return {
      _id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 0,
      wipeNumber: 1,
      accountId,
      profileId: "metadata",
      version: "no_version",
      stats: initialStats,
      items: defaultItems,
      commandRevision: 0,
    };
  }

  /**
   * Creates the initial stats for the profil
   * @returns The initial stats object
   */
  static createInitialStats() {
    return {
      attributes: {
        inventory_limit_bonus: 0,
      },
    };
  }

  /**
   * Creates the default items for the profile's loadout with random UUIDs.
   * @returns An object containing default items with randomized UUID keys
   */
  static createDefaultItmesWithUUIDs() {
    const defaultItems = {
      [uuid()]: this.createItemTemplate("Outpost:outpostcore_pve_01", 1),
    };

    return {
      defaultItems,
    };
  }

  /**
   * Creates a template for a specific item.
   * @param templateId - The ID of the item template.
   * @param level - The initial level for the item.
   * @returns The item template object.
   */
  static createItemTemplate(templateId: string, level: number) {
    return {
      quantity: 1,
      attributes: {
        cloud_save_info: {
          saveCount: 0,
          savedRecords: [],
        },
        level,
        outpost_core_info: {
          highestEnduranceWaveReached: "",
          placedBuildings: [],
          accountsWithEditPermission: [],
        },
      },
      templateId,
    };
  }

  getProfile(): IProfile {
    return this.profile;
  }
}
