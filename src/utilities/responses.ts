import { accountService, logger } from "..";
import type { IProfile } from "../../types/profilesdefs";

export type ProfileId =
  | "athena"
  | "common_core"
  | "creative"
  | "common_public"
  | "profile0"
  | "campaign"
  | "metadata"
  | "theater0"
  | "collection_book_people0"
  | "collection_book_schematics0"
  | "outpost0"
  | "collections";

interface BaseResponse {
  profileRevision: number;
  profileId: ProfileId;
  profileChangesBaseRevision: number;
  profileChanges: object[];
  profileCommandRevision: number;
  serverTime: string;
  responseVersion: number;
}

interface MultiUpdate {
  profileRevision: number;
  profileId: ProfileId;
  profileChangesBaseRevision: number;
  profileChanges: object[];
  profileCommandRevision: number;
}

interface RefundResponse extends BaseResponse {
  multiUpdate: MultiUpdate[];
}

interface PurchaseResponse extends BaseResponse {
  notifications: object[];
  multiUpdate: MultiUpdate[];
}

function generateBaseResponse(
  profile: IProfile,
  changes: object[],
  profileId: ProfileId,
): BaseResponse {
  return {
    profileRevision: profile.rvn,
    profileId,
    profileChangesBaseRevision: profile.rvn - 1,
    profileChanges: changes,
    profileCommandRevision: profile.rvn,
    serverTime: new Date().toISOString(),
    responseVersion: 1,
  };
}

function generateMultiUpdate(
  profile: IProfile,
  changes: object[],
  profileId: ProfileId,
): MultiUpdate {
  return {
    profileRevision: profile.rvn,
    profileId,
    profileChangesBaseRevision: profile.rvn - 1,
    profileChanges: changes,
    profileCommandRevision: profile.commandRevision,
  };
}

export default class MCPResponses {
  static generate(profile: IProfile, changes: object[], profileId: ProfileId): BaseResponse {
    return generateBaseResponse(profile, changes, profileId);
  }

  static generateBasic(
    profile: IProfile,
    changes: object[],
    profileId: ProfileId,
    notifications?: object[],
    multiUpdate?: object[],
  ) {
    return {
      profileRevision: profile.rvn,
      profileId,
      profileChangesBaseRevision: profile.rvn - 1,
      profileChanges: changes,
      notifications: notifications || [],
      multiUpdate: multiUpdate || [],
      profileCommandRevision: profile.commandRevision,
      serverTime: new Date().toISOString(),
      responseVerision: 1,
    };
  }

  static generateClaimLoginRewards(profile: IProfile, changes: object[], notifications: object[]) {
    return {
      ...generateBaseResponse(profile, changes, "campaign"),
      notifications,
    };
  }

  static generateRefundResponse(
    profile: IProfile,
    athena: IProfile,
    applyProfileChanges: object[],
    multiUpdates: object[],
    profileId: ProfileId,
  ): RefundResponse {
    return {
      ...generateBaseResponse(profile, applyProfileChanges, profileId),
      multiUpdate: [generateMultiUpdate(athena, multiUpdates, "athena")],
    };
  }

  static generatePurchaseResponse(
    profile: IProfile,
    athena: IProfile,
    applyProfileChanges: object[],
    multiUpdates: object[],
    notifications: object[],
    profileId: ProfileId,
  ): PurchaseResponse {
    return {
      ...generateBaseResponse(profile, applyProfileChanges, profileId),
      notifications: [
        {
          type: "CatalogPurchase",
          primary: true,
          lootResult: {
            items: notifications,
          },
        },
      ],
      multiUpdate: [generateMultiUpdate(athena, multiUpdates, "athena")],
    };
  }

  static generateRerollResponse(
    profile: IProfile,
    profileId: ProfileId,
    profileChanges: object[],
    notifications: object[],
  ) {
    return {
      ...generateBaseResponse(profile, profileChanges, profileId),
      notifications,
    };
  }
}
