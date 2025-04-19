import chalk from "chalk";
import type { Logger, QueryRunner } from "typeorm";

export default class OrmLogging implements Logger {
  private formatQuery(query: string): string {
    return query.replace(/\s+/g, " ").trim();
  }

  private extractTableNameFromQuery(query: string): string {
    const match = query.match(/(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+["'`]?(\w+)["'`]?/i);
    return match ? match[1] : "Unknown Table";
  }

  private shouldLogQuery(query: string): boolean {
    const lowerQuery = query.trim().toLowerCase();
    // Skip logging for transactions, specific statements, and SELECT queries
    return !(
      lowerQuery.startsWith("begin") ||
      lowerQuery.startsWith("commit") ||
      lowerQuery.startsWith("rollback") ||
      lowerQuery.startsWith("select") ||
      lowerQuery.startsWith("start transaction") ||
      lowerQuery.startsWith("set transaction isolation level")
    );
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (!query.trim() || !this.shouldLogQuery(query)) return;

    const tableName = queryRunner ? this.extractTableNameFromQuery(query) : "Unknown Table";
    console.log(
      chalk.cyanBright.bold("QUERY: ") +
        chalk.cyan(`Table: ${tableName} | ${this.formatQuery(query)}`),
    );
  }

  logQueryError(error: any, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (!query.trim() || !this.shouldLogQuery(query)) return;

    const tableName = queryRunner ? this.extractTableNameFromQuery(query) : "Unknown Table";
    // Forcefully convert error to a string
    console.error(
      chalk.cyanBright.bold("QUERY ERROR: ") + chalk.cyan(`Table: ${tableName} | ${String(error)}`),
    );
    console.log(chalk.cyan.bold("QUERY: ") + chalk.cyan(this.formatQuery(query)));
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (time < 100 || !this.shouldLogQuery(query)) return;

    const tableName = queryRunner ? this.extractTableNameFromQuery(query) : "Unknown Table";
    console.warn(
      chalk.cyanBright.bold("SLOW QUERY: ") + chalk.cyan(`Table: ${tableName} | (${time}ms)`),
    );
    console.log(chalk.cyan.bold("QUERY: ") + chalk.cyan(this.formatQuery(query)));
  }

  logSchemaBuild(message: string) {
    console.log(chalk.cyanBright.bold("SCHEMA BUILD: ") + chalk.cyan(message));
  }

  logMigration(message: string) {
    console.log(chalk.cyanBright.bold("MIGRATION: ") + chalk.cyan(message));
  }

  log(level: "log" | "info" | "warn", message: any) {
    switch (level) {
      case "log":
        console.log(chalk.cyanBright.bold("LOG: ") + chalk.cyan(message));
        break;
      case "info":
        console.info(chalk.cyanBright.bold("INFO: ") + chalk.cyan(message));
        break;
      case "warn":
        console.warn(chalk.cyanBright.bold("WARN: ") + chalk.cyan(message));
        break;
    }
  }
}
