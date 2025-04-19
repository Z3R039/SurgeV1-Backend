import {
  ProfileType,
  type IProfile,
  type ItemValue,
  type StatsAttributes,
} from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";
import LoadoutManager from "./loadouts/LoadoutManager";
import { v4 as uuid } from "uuid";

// Kindly pasted from my friend.
export default class AthenaProfile extends ProfileBase {
  public profile: IProfile;

  constructor(accountId: string) {
    const profile = AthenaProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  /**
   * Factory method to create a new profile for Athena.
   * @param accountId - The account ID associated with the profile.
   * @returns A fully initialized IProfile object.
   */
  static createProfile(accountId: string): IProfile {
    const { defaultItems, favoriteItemUUIDs } = this.createDefaultItemsWithUUIDs();
    const initialStats = this.createInitialStats(favoriteItemUUIDs);
    const profile = this.buildProfileSkeleton(accountId, defaultItems, initialStats);

    this.addInitialLoadout(profile);

    return profile;
  }

  /**
   * Builds the skeleton of the profile object with essential fields.
   * @param accountId - The account ID for the profile.
   * @param defaultItems - Predefined default items to initialize the profile.
   * @param initialStats - Initial stats for the profile.
   * @returns A profile object with default fields populated.
   */
  static buildProfileSkeleton(
    accountId: string,
    defaultItems: Partial<ItemValue>,
    initialStats: {
      attributes: Partial<StatsAttributes>;
    },
  ): IProfile {
    return {
      _id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 0,
      wipeNumber: 1,
      accountId,
      profileId: "athena",
      version: "no_version",
      stats: initialStats,
      items: defaultItems,
      commandRevision: 0,
    };
  }

  /**
   * Adds an initial loadout to the profile and updates the necessary fields.
   * @param profile - The profile to which the loadout will be added.
   */
  static addInitialLoadout(profile: IProfile) {
    const loadoutManager = new LoadoutManager(profile, uuid());
    loadoutManager.addLoadout();
    profile.stats.attributes.loadouts!.push(loadoutManager.getLoadoutId());
    profile.stats.attributes.last_applied_loadout = loadoutManager.getLoadoutId();
    profile.items = { ...profile.items, ...loadoutManager.profile.items };
  }

  /**
   * Creates the initial stats for the profile, including favorite item UUIDs.
   * @param favoriteItemUUIDs - The UUIDs of favorite items (character, pickaxe, etc.).
   * @returns The initial stats object with favorite items mapped to their UUIDs.
   */
  static createInitialStats(favoriteItemUUIDs: any) {
    return {
      attributes: {
        use_random_loadout: false,
        past_seasons: [],
        season_match_boost: 0,
        loadouts: [],
        mfa_reward_claimed: false,
        rested_xp_overflow: 0,
        current_mtx_platform: "Epic",
        last_xp_interaction: new Date().toISOString(),
        quest_manager: {
          dailyLoginInterval: "0001-01-01T00:00:00.000Z",
          dailyQuestRerolls: 1,
        },
        book_level: 1,
        season_num: 13,
        book_xp: 0,
        creative_dynamic_xp: {},
        season: {
          numWins: 0,
          numHighBracket: 0,
          numLowBracket: 0,
        },
        party_assist_quest: "",
        pinned_quest: "",
        vote_data: {
          electionId: "",
          voteHistory: {},
          votesRemaining: 0,
          lastVoteGranted: "",
        },
        lifetime_wins: 0,
        book_purchased: false,
        rested_xp_exchange: 1,
        level: 1,
        rested_xp: 2500,
        rested_xp_mult: 4.4,
        accountLevel: 1,
        rested_xp_cumulative: 52500,
        xp: 0,
        battlestars: 0,
        battlestars_season_total: 0,
        season_friend_match_boost: 0,
        active_loadout_index: 0,
        purchased_bp_offers: [],
        purchased_battle_pass_tier_offers: [],
        last_match_end_datetime: "",
        mtx_purchase_history_copy: [],
        last_applied_loadout: "",
        favorite_musicpack: "",
        banner_icon: "BRSeason01",
        favorite_character: favoriteItemUUIDs.character,
        favorite_itemwraps: ["", "", "", "", "", "", ""],
        favorite_skydivecontrail: "",
        favorite_pickaxe: favoriteItemUUIDs.pickaxe,
        favorite_glider: favoriteItemUUIDs.glider,
        favorite_backpack: "",
        favorite_dance: [favoriteItemUUIDs.dance, "", "", "", "", "", ""],
        favorite_loadingscreen: "",
        banner_color: "DefaultColor1",
      },
    };
  }

  /**
   * Creates the default items for the profile's loadout with random UUIDs.
   * @returns An object containing default items with randomized UUID keys and favorite item UUIDs.
   */
  static createDefaultItemsWithUUIDs() {
    const characterUUID = uuid();
    const pickaxeUUID = uuid();
    const gliderUUID = uuid();
    const danceUUID = uuid();
    const loadoutUUID = uuid();

    const defaultItems = {
      [characterUUID]: this.createItemTemplate(
        "AthenaCharacter:CID_001_Athena_Commando_F_Default",
        1,
      ),
      [pickaxeUUID]: this.createItemTemplate("AthenaPickaxe:DefaultPickaxe", 1),
      [gliderUUID]: this.createItemTemplate("AthenaGlider:DefaultGlider", 1),
      [danceUUID]: this.createItemTemplate("AthenaDance:EID_DanceMoves", 1),
    };

    return {
      defaultItems,
      favoriteItemUUIDs: {
        character: characterUUID,
        pickaxe: pickaxeUUID,
        glider: gliderUUID,
        dance: danceUUID,
      },
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
        favorite: false,
        item_seen: true,
        level,
        max_level_bonus: 0,
        rnd_sel_cnt: 0,
        variants: [],
        xp: 0,
      },
      templateId,
    };
  }

  /**
   * Retrieves the profile.
   * @returns The profile object.
   */
  getProfile(): IProfile {
    return this.profile;
  }
}
