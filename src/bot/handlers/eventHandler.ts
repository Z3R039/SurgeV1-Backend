import { ExtendedClient } from "../types/ExtendedClient";
import { Event } from "./Event";
import fs from "fs";
import path from "path";

export const loadEvents = async (client: ExtendedClient): Promise<void> => {
  const eventFiles = fs
    .readdirSync(path.join(__dirname, "../events"))
    .filter((file) => file.endsWith(".ts"));

  for (const file of eventFiles) {
    try {
      const EventModule = await import(`../events/${file}`);
      const EventClass = EventModule.default;
      const eventInstance: Event<any> = new EventClass(client);

      client.on(eventInstance.name, (...args) => eventInstance.run(...args));
    } catch (error) {
      console.error(`Error loading event ${file}:`, error);
    }
  }
};
