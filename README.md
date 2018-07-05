<h1 align=center>NadekoConnector</h1>
<p align=center><b>Exposes parts of the NadekoBot database for modification through JSONWebTokens. </b></p>

## Setup
- Run `npm i` to install all required dependencies. 
- Replace the path to `NadekoBot.db` in `config.json` .
- Change the `jwt_secret` key in `config.json`. Optional but recommended. 

## Endpoints

### getbal
Gets the currency balance for a given Discord user ID.  
### setbal
Updates the currency balance for a given Discord user ID.
### addtransaction
Adds a currency transaction for a given Discord user ID with the amount and reason.
Does not modify the amount by itself. Automatically adds UTC timestamps to the transaction. 
### getguildxp
Gets the XP of a Discord user with specified user ID and guild ID.
