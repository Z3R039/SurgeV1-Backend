import { v4 as uuid } from "uuid";
import type { ItemValue, StatsAttributes } from "../../../../../types/profilesdefs";

export interface ItemDefinition {
  templateId: string;
  attributes: Partial<ItemValue>;
  quantity: number;
}

export default class CampaignItemBuilder {
  private items: Record<string, ItemDefinition> = {};

  /**
   * Creates a new item with the given templateId, attributes, and quantity and returns the itemId of the new item.
   * @param templateId  templateId of the item to create
   * @param attributes  attributes of the item to create
   * @param quantity    quantity of the item to create
   * @returns The unique identifier of the newly created item.
   */
  createItem(templateId: string, attributes: Partial<ItemValue>, quantity: number): string {
    const itemId = uuid();

    this.items[itemId] = {
      templateId,
      attributes,
      quantity,
    };

    return itemId;
  }

  /**
   * Retreives the item with the given itemId.
   * @param itemId The unique identifier of the item to retrieve.
   * @returns The item if found, otherwise undefined.
   */
  getItem(itemId: string): ItemDefinition | undefined {
    return this.items[itemId] ?? undefined;
  }

  /**
   * Returns all items in the builder.
   * @returns An array of all items in the builder.
   */
  getAllItems(): ItemDefinition[] {
    return Object.values(this.items);
  }
}
