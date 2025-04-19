import type { User } from "../tables/user";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type { ProfileId } from "./responses";
import { logger, profilesService } from "..";
import type { Profiles } from "../tables/profiles";
import type { IProfile } from "../../types/profilesdefs";
import { createGameModeStats } from "./creations/static_creations";
import { ProfileManager } from "./managers/ProfileManager";
import type { Stats } from "../tables/seasonstats";

export default class ProfileHelper {
  static async createProfile(user: Partial<User>, profile: ProfileId): Promise<IProfile> {
    const profileTemplate = ProfileManager.createProfile(profile, user.accountId as string);

    profileTemplate.accountId = user.accountId!;
    profileTemplate.createdAt = new Date().toISOString();
    profileTemplate.updatedAt = new Date().toISOString();
    profileTemplate._id = uuid().replace(/-/g, "");
    profileTemplate.version = `Lynt/${user.accountId}/${profile}/${new Date().toISOString()}`;

    return profileTemplate;
  }

  static getItemByAttribute(profile: IProfile, attributeName: string, value: string) {
    const items = Object.entries(profile.items)
      .filter(([id, x]) => x.attributes && typeof x.attributes[attributeName] == value)
      .map((val) => ({ key: val[0], value: val[1] }));

    if (items.length === 0) {
      return null;
    }

    return items;
  }

  static getItemByTemplateId(profile: IProfile, templateId: string) {
    return Object.entries(profile.items)
      .filter(([id, x]) => x.templateId === templateId)
      .map((val) => ({ key: val[0], value: val[1] }));
  }

  static getItemByKey(profile: IProfile, key: string) {
    return profile.items[key];
  }

  static removeDailyQuests(profile: IProfile) {
    const dailyQuestIds = Object.entries(profile.items)
      .filter(([, item]) => item.templateId.includes("AthenaDaily"))
      .map(([id]) => id);

    console.log(dailyQuestIds);

    dailyQuestIds.forEach((id) => delete profile.items[id]);

    const multiUpdates = dailyQuestIds.map((id) => ({
      changeType: "itemRemoved",
      itemId: id,
    }));

    return multiUpdates;
  }
 
  static getProfileData(
    profile: Profiles,
    profileName: keyof Omit<Profiles, "accountId">,
  ): IProfile | null {
    return (profile[profileName] as IProfile) || null;
  }

  static async getProfile(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<IProfile | undefined> {
    try {
      const profile = await profilesService.findByName(accountId, profileName);

      if (!profile) {
        logger.error(`Profile of type ${profileName} not found.`);
        return undefined;
      }

      return ProfileHelper.getProfileData(profile, profileName) || undefined;
    } catch (error) {
      logger.error(`Failed to get profile of type ${profileName}: ${error}`);
      return undefined;
    }
  }

  static createStatsTemplate(): Stats {
    const gameModeStats = createGameModeStats();
    return {
      solos: gameModeStats,
      duos: gameModeStats,
      squads: gameModeStats,
      ltm: gameModeStats,
    };
  }
}
