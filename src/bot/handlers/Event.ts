import { Client, type ClientEvents } from "discord.js";

export abstract class Event<K extends keyof ClientEvents> {
  client: Client;
  name: K;

  constructor(client: Client, name: K) {
    this.client = client;
    this.name = name;
  }

  abstract run(...args: ClientEvents[K]): Promise<void>;
}
