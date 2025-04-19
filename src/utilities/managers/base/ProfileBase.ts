import type { IProfile } from "../../../../types/profilesdefs";

export default abstract class ProfileBase {
  protected profile: IProfile;

  constructor(profile: IProfile) {
    this.profile = profile;
  }

  abstract getProfile(): IProfile;
}
