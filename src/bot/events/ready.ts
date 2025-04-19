import { Event } from "../handlers/Event";
import { ActivityType, Client } from "discord.js";

export default class ReadyEvent extends Event<"ready"> {
  constructor(client: Client) {
    super(client, "ready");
  }

  async run(): Promise<void> {}
}
