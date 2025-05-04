
### SurgeV1 Backend

## Doesn't work its a 50/50 wth many bugs
## Not made for production usage


**Universal Fortnite Backend written in TypeScript using Postgres powered by TypeORM**

## NOTE
<br />
Version's 12.41 onwards are not supported and your character will be invisible.

## Requirements
- [Bun](https://bun.sh)
- [Git](https://git-scm.com/downloads)
- [Postgres](https://www.postgresql.org/download/)


# Available Quests

- **Season 6:** Daily & Week 1 Quests
- **Season 7:** Daily & Week 1 Quests
- **Season 8:** Daily & Week 1 Quests
- **Season 9:** Daily & Week 1 Quests
- **Season 13:** Daily & Week 1 Quests

## MAJOR TODO
- [x] backend startup without crashes
- [x] Fix bot commands not starting up (refreshing commands & loading commands)
- [x] Fix add vbucks command causing a full on server crash (Error executing command: vbucks - TypeError: undefined is not an object (evaluating 'profile.stats.attributes.gifts.push'))
- [ ] Fix item shop & battlepass on other seasons like 8.51 (unsure if others dont work or not will test soon)
- [ ] Random api stalls or bugs appearing after adding new features (unsure ngl because they pop out of nowhere **T-T**)
- [ ] Fix duplicate commands error
- [ ] Fix postgress "unknown table" (idk if its my brain not braining or the backend doing something wrong tbh)
![Banner](https://i.ibb.co/8Dd4sgww/Screenshot-2025-04-19-184354.png)

## TODO Features

- [x] Vbucks on kill/win
- [x] Easy setup
- [x] Auto shop
- [x] Battle Pass
- [x] XP & Leveling
- [x] Challenges
- [x] Friends
- [x] XMPP
- [x] Matchmaker
- [x] Party V1
- [x] Party V2
- [x] Daily rewards
- [x] Gifting
- [x] Purchasing from item shop
- [x] HWID Bans
- [x] Refunding
- [x] Save the World (kind of working but wont need ngl)
- [x] Arena
- [x] ClientSettings
- [x] GameSessions (works fine)
- [x] GameSessions Matchmaker (jyzo thanks)
- [x] Authentication using Permissions (eg... `fortnite:profile:abcd1234:commands`)
- [x] Leaderboards (Stats)
- [x] Launcher stuff (node for public use, you can try to use it)
- [x] Quest Claiming
- [x] Rewrite Session endpoints for GS
- [ ] Tournaments & Reward system
- [ ] Ingame Reporting & Feedback System
- [ ] Support a creator code
- [ ] Add All Quests & Battlepasses from S3 - S14
- [ ] Creative Save Island Plots into profile / database
- [ ] Host user made creative islands
- [ ] Optimizations (needs alot ngl)
- [x] Gameserver credential generator
- [x] Region Matchmaker
- [ ] Add support for seasons above 12.41
- [ ] Moderator Access only mode (and supporters later on)
- [ ] Voice chat
- [ ] Client sided events


## Save The world (wont use ngl)?
- Save the World (Works decently well, very buggy quest progression and not made for public use)
- Read stw todo here [TODO.md](./TODO.md)

