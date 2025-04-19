import { accountService, logger, userService } from "../..";
import type { Abilities, AbilitiesCombination, Permission } from "../../../types/permissionsdefs";
import type { Account } from "../../tables/account";
import { parseAbilities } from "./permissionhelpers";

const VALID_ABILITIES: Abilities[] = ["READ", "DELETE", "LIST", "CREATE", "*"];

const DEFAULT_ACTIONS = {
  READ: 1,
  UPDATE: 2,
  DELETE: 3,
  LIST: 4,
  CREATE: 5,
};

const DEFAULT_RESOURCES = {
  SYSTEM: "fortnite:cloudstorage:system",
  PROFILE_COMMANDS: (accountId: string) => `fortnite:profile:${accountId}:commands`,
  PROFILE_RECEIPTS: (accountId: string) => `fortnite:profile:${accountId}:receipts`,
  CALENDAR: "fortnite:calender",
  STATS: "fortnite:stats",
  DEFAULT_ENGINE: "fortnite:cloudstorage:system:DefaultEngine.ini",
  DEFAULT_GAME: "fortnite:cloudstorage:system:DefaultGame.ini",
  DEFAULT_RUNTIME: "fortnite:cloudstorage:system:DefaultRuntimeOptions.ini",
};

export default class PermissionInfo {
  constructor(public accountId: string) {
    if (this.accountId) {
      this.init().catch((error) => logger.error(`Error initializing permissions: ${error}`));
    }
  }

  private async init(): Promise<void> {
    const user = await this.getUser();
    if (user) {
      const defaultPermissions = this.createDefaultPermissions(user.accountId);
      await this.updatePermissions(defaultPermissions);
    }
  }

  private async getUser(): Promise<{ accountId: string } | null> {
    try {
      return await userService.findUserByAccountId(this.accountId);
    } catch (error) {
      logger.error(`Error fetching user: ${error}`);
      return null;
    }
  }

  private createDefaultPermissions(accountId: string): Permission[] {
    const permissions: Permission[] = [
      this.createPermission(DEFAULT_RESOURCES.SYSTEM, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(`${DEFAULT_RESOURCES.SYSTEM}:*`, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(`friends:${accountId}`, "READ,UPDATE,DELETE", DEFAULT_ACTIONS.UPDATE),
      this.createPermission(
        DEFAULT_RESOURCES.PROFILE_COMMANDS(accountId),
        "*",
        DEFAULT_ACTIONS.CREATE,
      ),
      this.createPermission(
        DEFAULT_RESOURCES.PROFILE_RECEIPTS(accountId),
        "*",
        DEFAULT_ACTIONS.CREATE,
      ),
      this.createPermission(DEFAULT_RESOURCES.CALENDAR, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_ENGINE, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_GAME, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_RUNTIME, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.STATS, "READ", DEFAULT_ACTIONS.READ),
    ];

    return permissions.filter((permission) => this.isValidPermission(permission));
  }

  private createPermission(
    resource: string,
    abilities: Abilities | AbilitiesCombination,
    action: number,
  ): Permission {
    return { resource, abilities, action };
  }

  private isValidPermission(permission: Permission): boolean {
    return (
      typeof permission.resource === "string" &&
      typeof permission.abilities === "string" &&
      typeof permission.action === "number" &&
      Object.values(DEFAULT_ACTIONS).includes(permission.action)
    );
  }

  private async findAccount(): Promise<Account | null> {
    try {
      if (!this.accountId) {
        logger.error("Account ID is not set.");
        return null;
      }
      return await accountService.findUserByAccountId(this.accountId);
    } catch (error) {
      logger.error(`Error finding account: ${error}`);
      return null;
    }
  }

  private async updatePermissions(permissions: Permission[]): Promise<void> {
    const account = await this.findAccount();
    if (account) {
      try {
        const updatedPermissions = this.mergePermissions(account.permissions, permissions);
        await accountService.updateAccount(this.accountId, { permissions: updatedPermissions });
      } catch (error) {
        logger.error(`Error updating permissions: ${error}`);
      }
    }
  }

  private mergePermissions(
    existingPermissions: Permission[],
    newPermissions: Permission[],
  ): Permission[] {
    const permissionsMap = new Map<string, Permission>();

    existingPermissions.forEach((p) => permissionsMap.set(p.resource, p));
    newPermissions.forEach((p) => permissionsMap.set(p.resource, p));

    return Array.from(permissionsMap.values());
  }

  public async removePermission(resource: string): Promise<boolean> {
    const account = await this.findAccount();
    if (!account) return false;

    try {
      const updatedPermissions = ((account.permissions as Permission[]) || []).filter(
        (permission) => permission.resource !== resource,
      );

      await accountService.updateAccount(this.accountId, { permissions: updatedPermissions });
      return true;
    } catch (error) {
      logger.error(`Error removing permission: ${error}`);
      return false;
    }
  }

  public async addPermission(permission: Permission): Promise<boolean> {
    if (!this.isValidPermission(permission)) {
      logger.error(`Invalid permission: ${JSON.stringify(permission)}`);
      return false;
    }

    const account = await this.findAccount();
    if (!account) return false;

    try {
      const existingPermissions = (account.permissions as Permission[]) || [];
      const updatedPermissions = this.mergePermissions(existingPermissions, [permission]);

      await accountService.updateAccount(this.accountId, { permissions: updatedPermissions });
      return true;
    } catch (error) {
      logger.error(`Error adding permission: ${error}`);
      return false;
    }
  }

  public async hasPermission(
    resource: string,
    requiredAbilities: Abilities | AbilitiesCombination[],
  ): Promise<boolean> {
    const account = await this.findAccount();
    if (!account) return false;

    try {
      const permissions = account.permissions as Permission[];
      const perm = permissions.find((p) => p.resource === resource);
      if (!perm) {
        logger.error(`Permission ${resource} does not exist.`);
        return false;
      }

      const abilitiesArray = Array.isArray(requiredAbilities)
        ? requiredAbilities.map((ra) => ra.trim())
        : [requiredAbilities.trim()];

      const permAbilities = parseAbilities(perm.abilities);

      return abilitiesArray.some(
        (ra) => permAbilities.includes(ra) || ra === "*" || permAbilities.includes("*"),
      );
    } catch (error) {
      logger.error(`Error checking permission: ${error}`);
      return false;
    }
  }

  public async getPermissions(): Promise<Permission[]> {
    const account = await this.findAccount();
    if (!account) return [];

    try {
      return (account.permissions as Permission[]) || [];
    } catch (error) {
      logger.error(`Error getting permissions: ${error}`);
      return [];
    }
  }

  public errorReturn(resource: string, ability: Abilities | AbilitiesCombination): string {
    return `Sorry, your login does not possess the permissions '${resource} ${ability}' needed to perform the requested operation.`;
  }

  private static createPermission(
    resource: string,
    abilities: Abilities | AbilitiesCombination,
    action: number,
  ): Permission {
    return { resource, abilities, action };
  }

  private static isValidPermission(permission: Permission): boolean {
    return (
      typeof permission.resource === "string" &&
      typeof permission.abilities === "string" &&
      this.isValidAbilities(permission.abilities) &&
      typeof permission.action === "number" &&
      Object.values(DEFAULT_ACTIONS).includes(permission.action)
    );
  }

  private static isValidAbilities(abilities: string): boolean {
    return abilities.split(",").every((a) => VALID_ABILITIES.includes(a.trim() as Abilities));
  }

  private static async fetchUser(accountId: string): Promise<{ accountId: string } | null> {
    try {
      return await userService.findUserByAccountId(accountId);
    } catch (error) {
      logger.error(`Error fetching user: ${error}`);
      return null;
    }
  }

  private static createDefaultPermissions(accountId: string): Permission[] {
    const permissions: Permission[] = [
      this.createPermission(DEFAULT_RESOURCES.SYSTEM, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(`${DEFAULT_RESOURCES.SYSTEM}:*`, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(`friends:${accountId}`, "READ,UPDATE,DELETE", DEFAULT_ACTIONS.UPDATE),
      this.createPermission(
        `${DEFAULT_RESOURCES.PROFILE_COMMANDS}:${accountId}`,
        "*",
        DEFAULT_ACTIONS.CREATE,
      ),
      this.createPermission(
        `${DEFAULT_RESOURCES.PROFILE_RECEIPTS}:${accountId}`,
        "*",
        DEFAULT_ACTIONS.CREATE,
      ),
      this.createPermission(DEFAULT_RESOURCES.CALENDAR, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_ENGINE, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_GAME, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.DEFAULT_RUNTIME, "READ", DEFAULT_ACTIONS.READ),
      this.createPermission(DEFAULT_RESOURCES.STATS, "READ", DEFAULT_ACTIONS.READ),
    ];

    return permissions.filter((permission) => this.isValidPermission(permission));
  }

  public async addDefaultPermissionsToAccount(accountId: string): Promise<boolean> {
    try {
      const user = await this.getUser();
      if (!user) {
        logger.error(`User with account ID ${accountId} does not exist.`);
        return false;
      }

      const defaultPermissions = this.createDefaultPermissions(accountId);
      const account = await accountService.findUserByAccountId(accountId);
      if (!account) {
        logger.error(`Account with ID ${accountId} does not exist.`);
        return false;
      }

      const updatedPermissions = this.mergePermissions(account.permissions, defaultPermissions);

      await accountService.updateAccount(accountId, { permissions: updatedPermissions });
      return true;
    } catch (error) {
      logger.error(`Error adding default permissions to account ${accountId}: ${error}`);
      return false;
    }
  }

  private static mergePermissions(
    existingPermissions: Permission[],
    newPermissions: Permission[],
  ): Permission[] {
    const permissionsMap = new Map<string, Permission>();

    existingPermissions.forEach((p) => permissionsMap.set(p.resource, p));
    newPermissions.forEach((p) => permissionsMap.set(p.resource, p));

    return Array.from(permissionsMap.values());
  }
}
