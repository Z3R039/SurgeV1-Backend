import { v4 as uuid } from "uuid";
import type { IProfile, ItemValue, StatsAttributes } from "../../../../types/profilesdefs";
import ProfileBase from "../base/ProfileBase";
import path from "node:path";
import type { ItemDefinition } from "./item/CampaignItemBuilder";
import CampaignItemBuilder from "./item/CampaignItemBuilder";

export default class CampaignProfile extends ProfileBase {
  protected profile: IProfile;
  constructor(accountId: string) {
    const profile = CampaignProfile.createProfile(accountId);
    super(profile);
    this.profile = profile;
  }

  /**
   * Creates a new campaign profile with default values.
   * @param accountId - The ID of the account associated with the profile.
   * @returns The newly created profile object.
   */
  static createProfile(accountId: string): IProfile {
    return {
      _id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 0,
      wipeNumber: 1,
      accountId,
      profileId: "campaign",
      version: "no_version",
      items: CampaignProfile.createInitialItems(),
      stats: CampaignProfile.createInitialStats(),
      commandRevision: 0,
    };
  }

  /**
   * Creates initial items for the campaign profile by loading from JSON and assigning UUIDs.
   * @returns A record of items with unique IDs and attributes.
   */
  static createInitialItems(): Record<string, ItemDefinition> {
    const initialItems = this.getInitialItemsData();
    const itemBuilder = new CampaignItemBuilder();

    const items: Record<string, ItemDefinition> = {};

    for (const item of initialItems) {
      const itemId = itemBuilder.createItem(item.templateId, item.attributes, item.quantity);
      items[itemId] = item;
    }

    return items;
  }

  /**
   * Retrieves the initial items data for the campaign profile.
   * @returns An array of initial items data.
   */
  private static getInitialItemsData(): {
    templateId: string;
    attributes: Partial<ItemValue>;
    quantity: number;
  }[] {
    return [
      {
        templateId: "Token:campaignaccess",
        attributes: {
          max_level_bonus: 0,
          level: 1,
          item_seen: false,
          xp: 0,
          favorite: false,
        },
        quantity: 1,
      },
      {
        templateId: "Token:homebasepoints",
        attributes: {
          max_level_bonus: 0,
          level: 1,
          item_seen: false,
          xp: 0,
          favorite: false,
        },
        quantity: 10,
      },
      {
        templateId: "HomebaseNode:startnode_commandcenter",
        attributes: {},
        quantity: 1,
      },
      {
        templateId: "Schematic:ammo_explosive",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "Hero:hid_commando_grenadegun_uc_t01",
        attributes: {
          hero_name: "DefaultHeroName",
          level: 1,
          squad_id: "squad_combat_adventuresquadone",
          squad_slot_idx: 0,
          building_slot_used: -1,
        },
        quantity: 1,
      },
      {
        templateId: "Schematic:ammo_bulletsheavy",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "Quest:homebasequest_researchpurchase",
        attributes: {
          quest_state: "Claimed",
          completion_unlock_skill_tree_researchfortitude: 0,
          last_state_change_time: "2024-09-16T01:26:50.347Z",
          max_level_bonus: 0,
          level: -1,
          item_seen: false,
          xp: 0,
          sent_new_notification: true,
          favorite: false,
        },
        quantity: 1,
      },
      {
        templateId: "Quest:achievement_craftfirstweapon",
        attributes: {
          quest_state: "Claimed",
          completion_custom_craftfirstweapon: 0,
          level: -1,
          item_seen: false,
          playlists: [],
          sent_new_notification: true,
          challenge_bundle_id: "",
          xp_reward_scalar: 1,
          quest_pool: "",
          bucket: "",
          creation_time: "2024-09-16T05:03:59.282Z",
          last_state_change_time: "2024-09-16T01:26:50.347Z",
          challenge_linked_quest_parent: "",
          challenge_linked_quest_given: "",
          max_level_bonus: 0,
          xp: 0,
          quest_rarity: "uncommon",
          favorite: false,
        },
        quantity: 1,
      },
      {
        templateId: "Quest:achievement_protectthesurvivors",
        attributes: {
          quest_state: "Claimed",
          completion_custom_protectthesurvivors: 1,
          creation_time: "2024-09-16T05:03:59.282Z",
          level: -1,
          item_seen: false,
          playlists: [],
          sent_new_notification: true,
          challenge_bundle_id: "",
          xp_reward_scalar: 1,
          challenge_linked_quest_given: "",
          quest_pool: "",
          bucket: "",
          last_state_change_time: "2024-09-16T01:26:50.347Z",
          challenge_linked_quest_parent: "",
          max_level_bonus: 0,
          xp: 0,
          quest_rarity: "uncommon",
          favorite: false,
        },
        quantity: 1,
      },
      {
        templateId: "Quest:homebaseonboarding",
        attributes: {
          creation_time: "2024-09-16T05:03:59.282Z",
          quest_state: "Active",
          last_state_change_time: "2024-09-16T05:03:59.282Z",
          level: -1,
          quest_rarity: "uncommon",
          xp_reward_scalar: 1,
          item_seen: false,
          completion_hbonboarding_completezone: 1,
          completion_hbonboarding_watchsatellitecine: 1,
          completion_hbonboarding_namehomebase: 0,
          sent_new_notification: true,
        },
        quantity: 1,
      },
      {
        templateId: "Quest:homebasequest_completeexpedition",
        attributes: {
          quest_state: "Claimed",
          last_state_change_time: "2024-09-16T01:26:50.347Z",
          max_level_bonus: 1,
          level: -1,
          item_seen: true,
          xp: 0,
          sent_new_notification: true,
          favorite: false,
          completion_collectexpedition: 1,
        },
        quantity: 1,
      },
      {
        templateId: "Schematic:ammo_bulletslight",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "Schematic:ammo_shells",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "Schematic:sid_assault_auto_c_ore_t00",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "Schematic:ammo_bulletsmedium",
        attributes: { level: 1 },
        quantity: 1,
      },
      {
        templateId: "AccountResource:SchematicXP",
        attributes: {
          item_seen: true,
          durability: 1,
          level: 1,
          favorite: false,
          xp: 100000,
        },
        quantity: 100000,
      },
      {
        templateId: "AccountResource:HeroXP",
        attributes: {
          item_seen: false,
          durability: 1,
          level: 1,
          favorite: false,
          xp: 0,
        },
        quantity: 100000,
      },
      {
        templateId: "AccountResource:PersonnelXP",
        attributes: {
          item_seen: false,
          durability: 1,
          level: 1,
          favorite: false,
          xp: 100000,
        },
        quantity: 100000,
      },
      {
        templateId: "Token:accountinventorybonus",
        attributes: {
          max_level_bonus: 0,
          level: 1,
          item_seen: false,
          xp: 0,
          favorite: false,
        },
        quantity: 25,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor1",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor2",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor3",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor4",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor5",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor6",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor7",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor8",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor9",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor10",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor11",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor12",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor13",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor14",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor15",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor16",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor17",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor18",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor19",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor20",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerColor:DefaultColor21",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner1",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner2",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner3",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner4",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner5",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner6",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner7",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner8",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner9",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner10",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner11",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner12",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner13",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner14",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner15",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner16",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner17",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner18",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner19",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner20",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner21",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner22",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner23",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner24",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner25",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner26",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner27",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner28",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner29",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner30",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:StandardBanner31",
        attributes: { item_seen: true },
        quantity: 1,
      },
      {
        templateId: "HomebaseBannerIcon:BRSeason01",
        attributes: { item_seen: true },
        quantity: 1,
      },
    ];
  }

  /**
   * Creates the initial stats for the campaign profile.
   * @returns The initial stats object.
   */
  static createInitialStats(): { attributes: Partial<StatsAttributes> } {
    return {
      attributes: {
        node_costs: {},
        mission_alert_redemption_record: {
          lastClaimedGuidPerTheater: null,
          lastClaimTimesMap: null,
        },
        twitch: {},
        client_settings: { pinnedQuestInstances: [] },
        level: 1,
        named_counters: {
          SubGameSelectCount_Campaign: {
            current_count: 1,
            last_incremented_time: "2024-09-16T05:04:46.290Z",
          },
          SubGameSelectCount_Athena: { current_count: 0, last_incremented_time: "" },
        },
        default_hero_squad_id: "",
        collection_book: {
          pages: [
            "CollectionBookPage:pageheroes_commando",
            "CollectionBookPage:pageheroes_constructor",
            "CollectionBookPage:pageheroes_ninja",
            "CollectionBookPage:pageheroes_outlander",
            "CollectionBookPage:pagepeople_defenders",
            "CollectionBookPage:pageranged_assault_weapons",
            "CollectionBookPage:pageranged_assault_weapons_crystal",
            "CollectionBookPage:pageranged_shotgun_weapons",
            "CollectionBookPage:pageranged_shotgun_weapons_crystal",
            "CollectionBookPage:page_ranged_pistols_weapons",
            "CollectionBookPage:page_ranged_pistols_weapons_crystal",
            "CollectionBookPage:pageranged_snipers_weapons",
            "CollectionBookPage:pageranged_snipers_weapons_crystal",
            "CollectionBookPage:pageranged_explosive_weapons",
            "CollectionBookPage:pagepeople_survivors",
            "CollectionBookPage:pagemelee_axes_weapons",
            "CollectionBookPage:pagemelee_axes_weapons_crystal",
            "CollectionBookPage:pagemelee_clubs_weapons",
            "CollectionBookPage:pagemelee_clubs_weapons_crystal",
            "CollectionBookPage:pagemelee_scythes_weapons",
            "CollectionBookPage:pagemelee_scythes_weapons_crystal",
            "CollectionBookPage:pagepeople_leads",
            "CollectionBookPage:pagepeople_uniqueleads",
            "CollectionBookPage:pagemelee_spears_weapons",
            "CollectionBookPage:pagemelee_spears_weapons_crystal",
            "CollectionBookPage:pagemelee_swords_weapons",
            "CollectionBookPage:pagemelee_swords_weapons_crystal",
            "CollectionBookPage:pagemelee_tools_weapons",
            "CollectionBookPage:pagemelee_tools_weapons_crystal",
            "CollectionBookPage:pagetraps_wall",
            "CollectionBookPage:pagetraps_ceiling",
            "CollectionBookPage:pagetraps_floor",
            "CollectionBookPage:pagespecial_hydraulic",
            "CollectionBookPage:pagespecial_hydraulic_crystal",
            "CollectionBookPage:pagespecial_stormzone_heroes",
            "CollectionBookPage:pagespecial_scavenger_heroes",
            "CollectionBookPage:pagespecial_scavenger",
            "CollectionBookPage:pagespecial_scavenger_crystal",
            "CollectionBookPage:pagespecial_halloween2017_heroes",
            "CollectionBookPage:pagespecial_halloween2017_workers",
          ],
          maxBookXpLevelAchieved: 0,
        },
        quest_manager: {
          dailyLoginInterval: "2017-12-25T01:44:10.602Z",
          dailyQuestRerolls: 1,
          questPoolStats: {
            dailyLoginInterval: "2017-12-25T01:44:10.602Z",
            poolLockouts: {
              poolLockouts: [
                {
                  lockoutName: "EnduranceDaily",
                },
              ],
            },
            poolStats: [
              {
                questHistory: [],
                rerollsRemaining: 0,
                nextRefresh: "2017-12-26T01:44:10.602Z",
                poolName: "EnduranceDaily",
              },
            ],
          },
        },
        campaign_stats: [],
        bans: {},
        gameplay_stats: [{ statName: "zonescompleted", statValue: 1 }],
        inventory_limit_bonus: 100000,
        current_mtx_platform: "Epic",
        weekly_purchases: {},
        daily_purchases: {
          lastInterval: "2017-08-29T00:00:00.000Z",
          purchaseList: { "1F6B613D4B7BAD47D8A93CAEED2C4996": 1 },
        },
        mode_loadouts: [],
        in_app_purchases: {
          receipts: [],
          ignoredReceipts: [],
          fulfillmentCounts: {},
          refreshTimers: {
            EpicPurchasingService: { nextEntitlementRefresh: "2023-12-08T03:26:04.126Z" },
          },
          version: 0,
        },
        daily_rewards: {
          nextDefaultReward: 0,
          totalDaysLoggedIn: 0,
          lastClaimDate: "0001-01-01T00:00:00.000Z",
          additionalSchedules: {
            founderspackdailyrewardtoken: { rewardsClaimed: 0, claimedToday: true },
          },
        },
        monthly_purchases: {},
        xp: 0,
        homebase: {
          townName: "",
          bannerIconId: "StandardBanner1",
          bannerColorId: "DefaultColor1",
          flagPattern: -1,
          flagColor: -1,
        },
        packs_granted: 0,
      },
    };
  }

  /**
   * Retrieves the current profile.
   * @returns The profile object.
   */
  getProfile(): IProfile {
    return this.profile;
  }
}
