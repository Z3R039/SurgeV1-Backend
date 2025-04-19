import { v4 as uuid } from "uuid";

export class Utils {
  static generateMatchId(): string {
    return uuid();
  }
}
