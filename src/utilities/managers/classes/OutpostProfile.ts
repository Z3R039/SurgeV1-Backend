import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class OutpostProfile extends ProfileBase {
  protected readonly profile: IProfile;

  constructor(accountId: string) {
    const profile = OutpostProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  static createProfile(accountId: string): IProfile {
    return {
      _id: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 0,
      wipeNumber: 1,
      accountId,
      profileId: "outpost0",
      version: "no_version",
      items: {},
      stats: {
        attributes: {
          inventory_limit_bonus: 0,
        },
      },
      commandRevision: 0,
    };
  }

  getProfile(): IProfile {
    return this.profile;
  }
}
