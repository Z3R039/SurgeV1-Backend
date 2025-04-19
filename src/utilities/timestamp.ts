const tomorrowAtMidnight = new Date();
tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1);
tomorrowAtMidnight.setHours(0, 0, 0, 0);
export const expiration = tomorrowAtMidnight.toISOString();

const nextWeekAtMidnight = new Date();
nextWeekAtMidnight.setDate(nextWeekAtMidnight.getDate() + 7);
nextWeekAtMidnight.setHours(0, 0, 0, 0);
export const nextWeekExpiration = nextWeekAtMidnight.toISOString();
