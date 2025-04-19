import { ExtendedClient } from "../types/ExtendedClient";
import { Event } from "./Event";
import fs from "fs";
import path from "path";

export const loadEvents = (client: ExtendedClient): void => {
  const eventFiles = fs
    .readdirSync(path.join(__dirname, "../events"))
    .filter((file) => file.endsWith(".ts"));

  for (const file of eventFiles) {
    const { default: EventClass } = require(`../events/${file}`);
    const eventInstance: Event<any> = new EventClass(client);

    client.on(eventInstance.name, (...args) => eventInstance.run(...args));
  }
};
