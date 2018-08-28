<h1 align=center>NadekoConnector</h1>
<p align=center><b>Exposes parts of the NadekoBot database for modification through JSONWebTokens. </b></p>

## Setup

- Run `npm i` to install all required dependencies.
- Set the bot configurations (databasePath, credentialsPath, port and password) in `config.json`
- Run `node main.js`.

## Endpoints

- getBotInfo
- getTables
- getFields
- execSql
- getCurrency
- setCurrency
- addCurrency
- subtractCurrency
- createTransaction
- getTransactions
- getGuildRank
- getGuildXp
- setGuildXp
- addGuildXp
- subtractGuildXp
- awardGuildXp
- getGuildXpLeaderboard
- getGuildXpRoleRewards
- getGuildXpCurrencyRewards
- getGlobalRank
- getGlobalXp
- getGlobalXpLeaderboard
- getClubLeaderboard
- getClubInfo
- getClubInfoByUser
- getClubMembers
