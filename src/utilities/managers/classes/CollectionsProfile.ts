import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class CollectionsProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = CollectionsProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  static createProfile(accountId: string): IProfile {
    return {
      _id: "",
      createdAt: "",
      updatedAt: "",
      rvn: 0,
      wipeNumber: 1,
      accountId,
      profileId: "collections",
      version: "no_version",
      items: {},
      stats: {
        attributes: {
          current_season: 31,
        },
      },
      commandRevision: 0,
    };
  }
  getProfile(): IProfile {
    return this.profile;
  }
}
