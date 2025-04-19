import { logger } from "../../../..";
import type {
  IProfile,
  ItemValue,
  LockerSlot,
  LockerSlotKey,
} from "../../../../../types/profilesdefs";

const DEFAULT_LOCKER_NAME = "PRESET 1";
const DEFAULT_BANNER_COLOR = "DefaultColor1";
const DEFAULT_BANNER_ICON = "StandardBanner1";
const DEFAULT_CHARACTER = "AthenaCharacter:CID_001_Athena_Commando_F_Default";
const DEFAULT_PICKAXE = "AthenaPickaxe:DefaultPickaxe";
const DEFAULT_GLIDER = "AthenaGlider:DefaultGlider";

// Kindly pasted from my friend
export default class LoadoutManager {
  public profile: IProfile;
  private loadoutId: string;

  constructor(profile: IProfile, loadoutId: string) {
    this.profile = profile;
    this.loadoutId = loadoutId;
  }

  addLoadout(): void {
    this.profile.items[this.loadoutId] = this.createLoadoutTemplate();
  }

  /**
   * Get the current loadout ID.
   * @returns {string} The loadout ID
   */
  getLoadoutId(): string {
    return this.loadoutId;
  }

  /**
   * Create the default template for the loadout sitem.
   * @returns {ItemValue} The default loadout item value
   */
  private createLoadoutTemplate() {
    return {
      attributes: {
        banner_color_template: DEFAULT_BANNER_COLOR,
        banner_icon_template: DEFAULT_BANNER_ICON,
        item_seen: true,
        locker_name: DEFAULT_LOCKER_NAME,
        locker_slots_data: {
          slots: this.createDefaultSlots(),
        },
      },
      quantity: 1,
      templateId: "CosmeticLocker:cosmeticlocker_athena",
    };
  }

  /**
   * Create the default locker slots configuration.
   * @returns {Record<string, LockerSlot>} The default locker slots data
   */
  private createDefaultSlots(): Record<LockerSlotKey, LockerSlot> {
    return {
      Backpack: this.createEmptySlot(),
      Character: this.createSlot([DEFAULT_CHARACTER]),
      Dance: this.createSlot(new Array(6).fill("")),
      Glider: this.createSlot([DEFAULT_GLIDER]),
      ItemWrap: this.createSlot(new Array(7).fill("")),
      LoadingScreen: this.createEmptySlot(),
      MusicPack: this.createEmptySlot(),
      Pickaxe: this.createSlot([DEFAULT_PICKAXE]),
      SkyDiveContrail: this.createEmptySlot(),
    };
  }

  /**
   * Create a slot with specified items.
   * @param {string[]} items - Items to be added in the slot
   * @returns {LockerSlot} Locker slot object
   */
  private createSlot(items: string[]): LockerSlot {
    return {
      activeVariants: items.map(() => ({ variants: [] })),
      items,
    };
  }

  /**
   * Create an empty slot (no items).
   * @returns {LockerSlot} Locker slot with empty items and activeVariants
   */
  private createEmptySlot(): LockerSlot {
    return {
      activeVariants: [],
      items: [],
    };
  }

  /**
   * Add an item to a specific locker slot.
   * @param {LockerSlotKey} slotKey - The locker slot to modify
   * @param {string} itemId - The item ID to add
   */
  addItemToSlot(slotKey: LockerSlotKey, itemId: string): void {
    const slot = this.profile.items[this.loadoutId].attributes.locker_slots_data!.slots[slotKey];
    if (slot) {
      slot.items.push(itemId);
      slot.activeVariants!.push({ variants: [] });
    } else {
      console.error(`Slot ${slotKey} does not exist in the loadout.`);
    }
  }

  /**
   * Remove an item from a specific locker slot.
   * @param {LockerSlotKey} slotKey - The locker slot to modify
   * @param {string} itemId - The item ID to remove
   */
  removeItemFromSlot(slotKey: LockerSlotKey, itemId: string): void {
    const slot = this.profile.items[this.loadoutId].attributes.locker_slots_data!.slots[slotKey];
    if (slot) {
      const itemIndex = slot.items.indexOf(itemId);
      if (itemIndex > -1) {
        slot.items.splice(itemIndex, 1);
        slot.activeVariants!.splice(itemIndex, 1);
      } else {
        logger.warn(`Item ${itemId} does not exist in slot ${slotKey}.`);
      }
    } else {
      logger.error(`Slot ${slotKey} does not exist in the loadout.`);
    }
  }

  /**
   * Update the banner settings for the loadout.
   * @param {string} bannerColor - New banner color
   * @param {string} bannerIcon - New banner icon
   */
  updateBanner(bannerColor: string, bannerIcon: string): void {
    const loadoutAttributes = this.profile.items[this.loadoutId].attributes;
    loadoutAttributes.banner_color_template = bannerColor;
    loadoutAttributes.banner_icon_template = bannerIcon;
  }
}
