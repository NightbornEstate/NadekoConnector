<h1 align=center>NadekoConnector</h1>
<p align=center><b>Exposes parts of the NadekoBot database for modification through JSONWebTokens. </b></p>

## Setup
- Run `npm i` to install all required dependencies. 
- Set the paths to `NadekoBot.db` and `credentials.json` in `config.json`.
- Modify the `password` in `config.json`. 
- Run `node server.js`. 

## Endpoints
- getBotInfo
- getTables
- getFields
- getBalance
- setBalance
- createTransaction
- getTransactions
- getGuildXp
- setGuildXp
- getGuildXpLeaderboard
- getGlobalXpLeaderboard
- getGuildXpRoleRewards
- getGuildXpCurrencyRewards

## Compatibility
Does not work with NodeJS 9 and 10 due to errors in the `sqlite3` package. NodeJS 8.x LTS recommended. 
