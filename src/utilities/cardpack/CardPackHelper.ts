export enum LlamaRarity {
  Common = 0,
  Silver = 1,
  Gold = 2,
  Storm = 3,
}

interface LlamaDrop {
  rarity: LlamaRarity;
  itemsQuantity: number;
}

const rarityThresholds: {
  threshold: number;
  rarity: LlamaRarity;
  minItems: number;
  maxItems: number;
}[] = [
  { threshold: 0.05, rarity: LlamaRarity.Storm, minItems: 20, maxItems: 30 },
  { threshold: 0.1, rarity: LlamaRarity.Gold, minItems: 10, maxItems: 15 },
  { threshold: 0.2, rarity: LlamaRarity.Silver, minItems: 6, maxItems: 10 },
  { threshold: 1.0, rarity: LlamaRarity.Common, minItems: 4, maxItems: 8 },
];

export namespace CardPackHelper {
  export function getRandomLlama(): LlamaDrop {
    const randomThreshold = Math.random();

    for (const threshold of rarityThresholds) {
      if (randomThreshold < threshold.threshold) {
        return {
          rarity: threshold.rarity,
          itemsQuantity:
            Math.floor(Math.random() * (threshold.maxItems - threshold.minItems)) +
            threshold.minItems,
        };
      }
    }

    throw new Error("Failed to find random threshold.");
  }
}
