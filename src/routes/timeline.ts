import { app, db, logger } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";
import TimelineHelper from "../utilities/timelinehelper";
import { expiration, nextWeekExpiration } from "../utilities/timestamp";
import uaparser from "../utilities/uaparser";

export default function () {
  app.get("/fortnite/api/calendar/v1/timeline", async (c) => {
    const date = new Date();
    const useragent = c.req.header("User-Agent");

    if (!useragent)
      return c.json(
        errors.createError(400, c.req.url, "header 'User-Agent' is missing.", date.toISOString()),
        400,
      );

    const uahelper = uaparser(useragent);

    if (!uahelper)
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", date.toISOString()),
        400,
      );

    const activeEvents = await TimelineHelper.createTimeline(useragent);

    return c.json({
      channels: {
        "client-matchmaking": {
          states: [],
          cacheExpire: "9999-01-01T00:00:00.000Z",
        },
        "community-votes": {
          states: [
            {
              validFrom: "0001-01-01T00:00:00.000Z",
              activeEvents: [],
              state: {
                electionId: "",
                candidates: [],
                electionEnds: "9999-12-31T23:59:59.999Z",
                numWinners: 1,
                wipeNumber: 1,
                winnerStateHours: 1,
                offers: [],
              },
            },
          ],
          cacheExpire: "9999-01-01T00:00:00.000Z",
        },
        "client-events": {
          states: [
            {
              validFrom: "0001-01-01T00:00:00.000Z",
              activeEvents,
              state: {
                activeStorefronts: [],
                eventNamedWeights: {},
                seasonNumber: uahelper.season,
                seasonTemplateId: `AthenaSeason:athenaseason${uahelper.season}`,
                matchXpBonusPoints: 0,
                seasonBegin: "2020-01-01T00:00:00Z",
                seasonEnd: "9999-01-01T00:00:00Z",
                seasonDisplayedEnd: "9999-01-01T00:00:00Z",
                weeklyStoreEnd: expiration,
                stwEventStoreEnd: nextWeekExpiration,
                stwWeeklyStoreEnd: expiration,
                sectionStoreEnds: {},
                dailyStoreEnd: expiration,
              },
            },
          ],
          cacheExpire: expiration,
        },
      },
      eventsTimeOffsetHrs: 0,
      cacheIntervalMins: 10,
      currentTime: new Date().toISOString(),
    });
  });
}
