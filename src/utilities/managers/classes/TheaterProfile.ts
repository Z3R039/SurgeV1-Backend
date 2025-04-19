import { v4 as uuid } from "uuid";
import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class TheaterProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = TheaterProfile.createProfile(accountId);
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
      profileId: "theater0",
      version: "no_version",
      stats: TheaterProfile.createInitialStats(),
      items: TheaterProfile.createInitialItems(),
      commandRevision: 0,
    };
  }

  getProfile(): IProfile {
    return this.profile;
  }

  static createPlayerLoadout(): object {
    return {
      bPlayerIsNew: false,
      pinnedSchematicInstances: [],
      primaryQuickBarRecord: TheaterProfile.createQuickBarRecord(9),
      secondaryQuickBarRecord: TheaterProfile.createQuickBarRecord(7),
      zonesCompleted: 0,
    };
  }

  static createQuickBarRecord(numSlots: number): object {
    return {
      slots: Array(numSlots).fill({ items: [] }),
    };
  }

  /**
   * Creates the initial stats for the profile.
   * @returns {object} - The initial stats object, including attributes like inventory limit and player loadout.
   */
  static createInitialStats(): { attributes: object } {
    return {
      attributes: {
        inventory_limit_bonus: 0,
        last_event_instance_key: "",
        last_zones_completed: 0,
        past_lifetime_zones_completed: 0,
        player_loadout: TheaterProfile.createPlayerLoadout(),
        theater_unique_id: "",
      },
    };
  }

  /**
   * Creates the initial items for the profile.
   * This is an empty object by default but can be extended to include default items.
   * @returns {object} - The initial items object, which is currently empty.
   */
  static createInitialItems(): {
    [key: string]: {
      templateId: string;
      attributes: object;
      quantity: number;
    };
  } {
    return {};
  }
}
