import type { IProfile } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";

export default class CreativeProfile extends ProfileBase {
  protected profile: IProfile;

  constructor(accountId: string) {
    const profile = CreativeProfile.createProfile(accountId);
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
      accountId: "",
      profileId: "creative",
      version: "no_version",
      items: {},
      stats: {
        attributes: {
          last_used_project: "",
          max_island_plots: 50,
          publish_allowed: false,
          support_code: "",
          last_used_plot: "",
          permissions: [],
          creator_name: "",
        },
      },
      commandRevision: 0,
    };
  }

  getProfile(): IProfile {
    return this.profile;
  }
}
