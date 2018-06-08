# NadekoConnector
Exposes the Nadeko db for modification through endpoints on localhost. Requires signed JSONWebTokens. 

## Setup
Run `npm i` & replace the path to `NadekoBot.db` and change the `jwt_secret` key. 

## Endpoints
### getbal
Gets the currency balance for a given uid. Returns `balance`.
### setbal
Updates the currency balance for a given uid. Returns `success`.
### addtransaction
Adds a currency transaction for given uid with the amount and reason. Returns `success`.
Does not modify the amount by itself. Automatically adds UTC timestamps to the transaction. 
### getguildxp
Gets the XP of a user with specified guildId and uid. Returns `guildXp`, `awardedXp` and `totalXp`. 
