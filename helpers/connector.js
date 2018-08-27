var jsonbs = require("json-bigint")({ storeAsString: true });
var knex = require("knex");
var fs = require("fs");
var path = require("path");

class Connector {

	/**
	 * Creates a new Connector for the specified configuration.
	 * @param {String} databasePath Path to the database (.db)
	 * @param {String} credentialsPath Path to the credentials file (.json)
	 * @param {[String]} [disabledEndpoints=[]] Endpoints to disable.
	 * @param {Boolean} readOnly Whether the connector should be read-only.
	 */
	constructor(databasePath, credentialsPath, disabledEndpoints, readOnly) {
		this.db = new knex({
			client: "sqlite3",
			connection: { filename: databasePath },
			useNullAsDefault: true
		});
		this.credentials = jsonbs.parse(fs.readFileSync(path.resolve(credentialsPath)).toString());

		this._endpoints = [
			"getBotInfo",
			"getTables",
			"getFields",
			"execSql",
			"getCurrency",
			"setCurrency",
			"addCurrency",
			"createTransaction",
			"getTransactions",
			"getGuildRank",
			"getGuildXp",
			"setGuildXp",
			"getGuildXpLeaderboard",
			"getGuildXpRoleRewards",
			"getGuildXpCurrencyRewards",
			"getGlobalRank",
			"getGlobalXp",
			"getGlobalXpLeaderboard",
			"getClubs"];

		if (!disabledEndpoints)
			disabledEndpoints = [];

		let readOnlyEndpoints = [
			"getBotInfo",
			"getTables",
			"getFields",
			"getCurrency",
			"getTransactions",
			"getGuildRank",
			"getGuildXp",
			"getGuildXpLeaderboard",
			"getGuildXpRoleRewards",
			"getGuildXpCurrencyRewards",
			"getGlobalRank",
			"getGlobalXp",
			"getGlobalXpLeaderboard",
			"getClubs"];

		if (readOnly)
			disabledEndpoints = disabledEndpoints.concat(this._endpoints.filter((endpoint) => !readOnlyEndpoints.includes(endpoint)));
		this._disabledEndpoints = [...new Set(disabledEndpoints)];

		this._init = false;
	}

	/**
	 * Gets all endpoints implemented in the Connector.
	 * @return {[String]} Array of endpoints.
	 */
	get allEndpoints() {
		return this._endpoints;
	}

	/**
	 * Gets available endpoints for the current Connector instance.
	 * @return {[String]} Array of available endpoints.
	 */
	get endpoints() {
		return this._endpoints.filter((element) => !this._disabledEndpoints.includes(element));
	}

	/**
	 * Gets disabled endpoints for the current Connector instance.
	 * @return {[String]} Array of disabled endpoints.
	 */
	get disabledEndpoints() {
		return this._disabledEndpoints;
	}
	/**
	 * Sets disabled endpoints for the current Connector instance.
	 * @param {[String]} disabledEndpoints Array of disabled endpoints.
	 */
	set disabledEndpoints(disabledEndpoints) {
		this._disabledEndpoints = disabledEndpoints;
	}

	/**
	 * Get the initialization state of the connector.
	 * @returns {Boolean} Whether the connector is initialized or not.
	 */
	get initialized() {
		return this._init;
	}

	/**
	 * Calculate levels gained from a given amount of XP.
	 * @param {Number} xp XP to calculate level for.
	 * @returns {Object} Level information.
	 */
	async calcLevel(xp) {
		if (typeof xp !== "number" || xp < 0)
			throw new Error("XP must be a valid numerical value.");
		let level = 1,
			required = 0;
		while (true) {
			required = 36 + (9 * (level - 1));
			if (xp >= required) {
				xp -= required;
				level++;
			}
			if (xp < required)
				break;
		}
		return {
			level: level - 1,
			levelXp: xp,
			requiredXp: required + 9
		};
	}

	/**
	 * Check if the connector has been initialized or not.
	 */
	async checkInitialized() {
		if (!this._init)
			throw new Error("Connector not initialized. This may lead to unexpected errors.");
	}

	/**
	 * Check if the endpoint has been disabled.
	 */
	async checkEndpoint(endpoint) {
		await this.checkInitialized();
		if (this._disabledEndpoints.map(endpoint => endpoint.toLowerCase()).includes(endpoint.toLowerCase()))
			throw new Error("Endpoint disabled.");
	}

	/**
	 * Initialize the connector.
	 */
	async initialize() {
		this._init = true;
		await this.db.raw("PRAGMA journal_mode=OFF");
		await this.db.raw("PRAGMA locking_mode=NORMAL");
		await this.db.raw("PRAGMA synchronous=OFF");
		await this.db.raw("PRAGMA optimize");
	}

	/**
	 * Gets info about the bot.
	 * @returns {Object} Info about the bot.
	 */
	async getBotInfo() {
		await this.checkEndpoint("getBotInfo");
		let dbInfo = await this.db.first("CurrencySign", "CurrencyName", "CurrencyPluralName", "XpPerMessage", "XpMinutesTimeout").from("BotConfig");
		if (!dbInfo)
			throw new Error("Unable to fetch bot configuration.");
		if (!this.credentials)
			throw new Error("Unable to fetch bot credentials.");
		let info = {
			id: this.credentials.ClientId,
			owners: this.credentials.OwnerIds,
			currency: {
				sign: dbInfo.CurrencySign,
				name: dbInfo.CurrencyName,
				pluralName: dbInfo.CurrencyPluralName
			},
			xp: {
				perMessage: dbInfo.XpPerMessage,
				interval: dbInfo.XpMinutesTimeout
			}
		};
		return {
			bot: info
		};
	}

	/**
	 * Gets the tables present in the database.
	 * @returns {Object} Array of table names.
	 */
	async getTables() {
		await this.checkEndpoint("getTables");
		let tables = await this.db.select("name").from("sqlite_master").where({
			type: "table"
		}).map(table => table.name);
		if (!tables)
			throw new Error("Unable to list tables.");
		this.tables = tables;
		return {
			tables: tables
		};
	}

	/**
	 * Gets fields present in the specified table.
	 * @param {String} table Name of the table.
	 * @returns {Object} Array of field names.
	 */
	async getFields(table) {
		await this.checkEndpoint("getFields");
		if (!this.tables)
			this.tables = await this.getTables({}).tables;
		if (!this.tables.includes(table))
			throw new Error("Table not present.");
		let fields = await this.db.from(table).columnInfo();
		if (!fields)
			throw new Error("Unable to get fields.");
		return {
			fields: Object.keys(fields)
		};
	}

	/**
	 * Execute a raw SQL query and return the rows.
	 * @param {String} command The SQL command to execute.
	 * @returns {Object} Result of the command, array of rows if multiple rows were affected or a single JSON object if a single row was affected.
	 */
	async execSql(command) {
		await this.checkEndpoint("execSql");
		let result = await this.db.raw(command);
		let rowsAffected = result.length;
		if (!result)
			throw new Error("No rows were affected.");
		if (Array.isArray(result) && rowsAffected === 1)
			return {
				result: result[0]
			};
		return {
			result: result,
			rowsAffected: rowsAffected
		};
	}

	/**
	 * Check if a Discord guild exists in the database.
	 * @param {String} guildId ID of the Discord guild.
	 */
	async checkIfGuildExists(guildId) {
		if (typeof guildId !== "string")
			throw new Error("IDs must be provided as strings to avoid loss of precision.");
		let guilds = await this.db.raw("select cast(GuildId as text) as 'guildId' from GuildConfigs").map(element => element.guildId);
		if (!guilds.includes(guildId))
			throw new Error("Guild not found.");
	}

	/**
	 * Check if a Discord user exists in the database.
	 * @param {String} userId ID of the Discord user.
	 */
	async checkIfUserExists(userId) {
		if (typeof userId !== "string")
			throw new Error("IDs must be provided as strings to avoid loss of precision.");
		let users = await this.db.raw("select cast(UserId as text) as 'userId' from DiscordUser").map(element => element.userId);
		if (!users.includes(userId))
			throw new Error("User not found.");
	}

	/**
	 * Get the currency of a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @returns {Object} Balance info about the specified user.
	 */
	async getCurrency(userId) {
		await this.checkEndpoint("getCurrency");
		await this.checkIfUserExists(userId);
		let info = await this.db.raw(`select cast(UserId as text) as 'userId', CurrencyAmount as 'currency' from DiscordUser where UserId = ${userId}`);
		if (!info)
			throw new Error("Unable to fetch currency.");
		return info[0];
	}

	/**
	 * Set the currency of a Discord user. NOT RECOMMENDED! Use addCurrency instead for normal transactions.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} currency Currency amount to be set.
	 * @returns {Object} Balance info about the specified user.
	 */
	async setCurrency(userId, currency) {
		await this.checkEndpoint("setCurrency");
		await this.checkIfUserExists(userId);
		let updatedRows = await this.db.from("DiscordUser").update({ CurrencyAmount: currency }).where({ UserId: userId });
		if (updatedRows < 1)
			throw new Error("Unable to update currency.");
		return {
			userId: userId,
			currency: currency
		};
	}

	/**
	 * Update the bot's currency and transactions.
	 * @param {String} reason Reason for the transaction.
	 * @param {Number} currency Currency amount to be set.
	 */
	async updateBotCurrency(currency, reason) {
		let { bot } = await this.getBotInfo();
		if (!bot)
			throw new Error("Unable to fetch bot information.");
		await this.db.raw(`update DiscordUser set CurrencyAmount =  CurrencyAmount ${currency > -1 ? "-" : "+"} ${Math.abs(currency)} where UserId = ${bot.id}`);
		let botTransactionCreated = await this.createTransaction(bot.id, -1 * currency, reason);
		if (!botTransactionCreated)
			throw new Error("Unable to create a currency transaction for the bot.");
	}

	/**
	 * Add currency to a user.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} currency Currency amount to be set.
	 * @param {String} reason Reason for the transaction.
	 * @returns {Object} Balance info about the specified user.
	 */
	async addCurrency(userId, currency, reason) {
		await this.checkEndpoint("addCurrency");
		await this.checkIfUserExists(userId);
		let oldCurrency = await this.getCurrency(userId).currency;
		currency = currency > -1 ? currency : -1 * Math.min(Math.abs(currency), Math.abs(oldCurrency));
		await this.db.raw(`update DiscordUser set CurrencyAmount =  CurrencyAmount ${currency > -1 ? "+" : "-"} ${Math.abs(currency)} where UserId = ${userId}`);
		let userTransactionCreated = await this.createTransaction(userId, currency, reason);
		if (!userTransactionCreated)
			throw new Error("Unable to create a currency transaction for the user.");
		await this.updateBotCurrency(currency, reason);
		return await this.getCurrency(userId);
	}

	/**
	 * Create a transaction for a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} currency Amount added to or subtracted from the user.
	 * @param {String} reason Reason for the transaction.
	 * @returns {Object} Transaction info.
	 */
	async createTransaction(userId, currency, reason) {
		await this.checkEndpoint("createTransaction");
		let dateAdded = new Date().toISOString().replace(/[TZ]/g, " ");
		let row = await this.db.from("CurrencyTransactions").insert({
			UserId: userId,
			Amount: currency,
			Reason: reason,
			DateAdded: dateAdded
		});
		if (!row)
			throw new Error("Unable to create a transaction.");
		return {
			userId: userId,
			transactionId: row[0]
		};
	}

	/**
	 * Get transactions of a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} startPosition Start position/offset of transactions.
	 * @param {Number} items Items per page.
	 * @returns {Object} Transactions.
	 */
	async getTransactions(userId, startPosition = 0, items = 10) {
		await this.checkEndpoint("getTransactions");
		await this.checkIfUserExists(userId);
		let transactions = await this.db.raw(`select Id as 'transactionId', Amount as 'amount', Reason as 'reason', DateAdded as 'dateAdded' from CurrencyTransactions where UserId = ${userId} order by Id desc limit ${items} offset ${startPosition}`);
		if (!transactions)
			throw new Error("User not found.");
		return {
			userId: userId,
			transactions: transactions
		};
	}

	/**
	 * Get ranking of a Discord user in a specific guild.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @returns {Object} Rank info.
	 */
	async getGuildRank(userId, guildId) {
		await this.checkEndpoint("getGuildRank");
		await this.checkIfUserExists(userId);
		await this.checkIfGuildExists(guildId);
		let guildRankings = await this.db.raw(`select cast(UserId as text) as 'id' from UserXpStats where GuildId=${guildId} order by Xp+AwardedXp desc`).map(user => user.id);
		if (!guildRankings)
			throw new Error("Unable to get guild rankings.");
		let rank = await guildRankings.indexOf(userId);
		if (rank < 0)
			rank = guildRankings.length;
		return { userId: userId, rank: ++rank };
	}

	/**
	 * Get the guild XP of a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @returns {Object} Information about the user's XP.
	 */
	async getGuildXp(userId, guildId) {
		await this.checkEndpoint("getGuildXp");
		await this.checkIfUserExists(userId);
		await this.checkIfGuildExists(guildId);
		let xpInfo = await this.db.first("Xp", "AwardedXp").from("UserXpStats").where({
			UserId: userId,
			GuildId: guildId
		});
		if (!xpInfo)
			throw new Error("Unable to find the user/guild.");
		let rankInfo = await this.getGuildRank(userId, guildId);
		if (!rankInfo)
			throw new Error("Unable to get rank.");
		let levelInfo = await this.calcLevel(xpInfo.Xp + xpInfo.AwardedXp);
		if (!levelInfo)
			throw new Error("Unable to calculate level.");
		return {
			guildXp: xpInfo.Xp,
			awardedXp: xpInfo.AwardedXp,
			totalXp: xpInfo.Xp + xpInfo.AwardedXp,
			level: levelInfo.level,
			levelXp: levelInfo.levelXp,
			requiredXp: levelInfo.requiredXp,
			rank: rankInfo.rank
		};
	}

	/**
	 * Set the guild XP of a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @param {String} xp XP of the Discord user.
	 * @param {String} awardedXp XP awarded to the Discord user.
	 * @returns {Object} Information about the user's guild XP.
	 */
	async setGuildXp(userId, guildId, xp, awardedXp) {
		await this.checkEndpoint("setGuildXp");
		await this.checkIfUserExists(userId);
		await this.checkIfGuildExists(guildId);
		let updatedRows = await this.db.from("UserXpStats").update({ Xp: xp, AwardedXp: awardedXp }).where({ UserId: userId, GuildId: guildId });
		if (updatedRows < 1)
			throw new Error("Unable to update guild XP.");
		let xpInfo = await this.getGuildXp(userId, guildId);
		if (!xpInfo)
			throw new Error("Unable to fetch XP info.");
		return xpInfo;
	}

	/**
	 * Get XP leaderboard of a Discord guild.
	 * @param {String} guildId ID of the guild to get XP leaderboard of.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Leaderboard page.
	 */
	async getGuildXpLeaderboard(guildId, startPosition = 0, items = 10) {
		await this.checkEndpoint("getGuildXpLeaderboard");
		await this.checkIfGuildExists(guildId);
		let leaderboard = await this.db.raw(`select cast(UserId as text) as 'userId', Xp as 'xp', AwardedXp as 'awardedXp' from UserXpStats where GuildId=${guildId} order by (xp + awardedXp) desc limit ${items} offset ${startPosition}`);
		leaderboard = await Promise.all(leaderboard.map(async (user, rank) => {
			let levelInfo = await this.calcLevel(user.xp + user.awardedXp);
			user.level = levelInfo.level;
			user.levelXp = levelInfo.levelXp;
			user.requiredXp = levelInfo.requiredXp;
			user.rank = startPosition + rank + 1;
			return user;
		}));
		if (!leaderboard)
			throw new Error("Unable to fetch guild XP leaderboard.");
		return {
			leaderboard: leaderboard
		};
	}

	/**
	 * Get XP role rewards of a Discord guild.
	 * @param {String} guildId ID of the guild to get XP role rewards of.
	 * @returns {Object} Role rewards.
	 */
	async getGuildXpRoleRewards(guildId) {
		await this.checkEndpoint("getGuildXpRoleRewards");
		await this.checkIfGuildExists(guildId);
		let rewards = await this.db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', cast (a.RoleId as text) as 'roleId' from XpRoleReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc`);
		if (!rewards)
			throw new Error("Unable to fetch role rewards.");
		return {
			rewards: rewards
		};
	}

	/**
	 * Get XP currency rewards of a Discord guild.
	 * @param {String} guildId ID of the guild to get XP currency rewards of.
	 * @returns {Object} Currency rewards.
	 */
	async getGuildXpCurrencyRewards(guildId, startPosition = 0, items = 10) {
		await this.checkEndpoint("getGuildXpCurrencyRewards");
		await this.checkIfGuildExists(guildId);
		let rewards = await this.db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', a.Amount as 'amount' from XpCurrencyReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc limit ${items} offset ${startPosition}`);
		if (!rewards)
			throw new Error("Unable to fetch currency rewards.");
		return {
			rewards: rewards
		};
	}

	/**
	 * Get global ranking of a Discord user.
	 * @param {String} userId ID of the user to get global ranking of.
	 * @returns {Object} Rank info.
	 */
	async getGlobalRank(userId) {
		await this.checkEndpoint("getGlobalRank");
		await this.checkIfUserExists(userId);
		let globalRankings = await this.db.raw("select cast(UserId as text) as 'id' from UserXpStats group by UserId order by sum(Xp) desc").map(user => user.id);
		let rank = await globalRankings.indexOf(userId);
		if (rank < 0)
			rank = globalRankings.length;
		return { userId: userId, rank: ++rank };
	}

	/**
 	* Get the global XP of a Discord user.
 	* @param {String} userId ID of the Discord user.
 	* @returns {Object} Information about the user's global XP.
 	*/
	async getGlobalXp(userId) {
		await this.checkEndpoint("getGlobalXp");
		await this.checkIfUserExists(userId);
		let { globalXp } = await this.db.from("UserXpStats").where({ UserId: userId }).sum({ globalXp: "Xp" })[0];
		if (!globalXp)
			throw new Error("User not found.");
		let levelInfo = await this.calcLevel(globalXp);
		if (!levelInfo)
			throw new Error("Unable to calculate level.");
		let rankInfo = await this.getGlobalRank(userId);
		if (!rankInfo)
			throw new Error("Unable to get rank.");
		return {
			globalXp: globalXp,
			level: levelInfo.level,
			levelXp: levelInfo.levelXp,
			requiredXp: levelInfo.requiredXp,
			rank: rankInfo.rank
		};
	}

	/**
	 * Get the global XP leaderboard.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Leaderboard page.
	 */
	async getGlobalXpLeaderboard(startPosition = 0, items = 10) {
		await this.checkEndpoint("getGlobalXpLeaderboard");
		let leaderboard = await this.db.raw(`select cast(UserId as text) as 'userId', sum(Xp) as 'xp' from UserXpStats group by userId order by sum(Xp) desc limit ${items} offset ${startPosition}`);
		if (!leaderboard)
			throw new Error("Unable to fetch global XP leaderboard.");
		leaderboard = await Promise.all(leaderboard.map(async (user, rank) => {
			let levelInfo = await this.calcLevel(user.xp);
			user.level = levelInfo.level;
			user.levelXp = levelInfo.levelXp;
			user.requiredXp = levelInfo.requiredXp;
			user.rank = startPosition + rank + 1;
			return user;
		}));
		return {
			leaderboard: leaderboard
		};
	}

	async getClubs() {
		await this.checkEndpoint("getClubs");
		let clubs = await this.db.raw("select (a.Name || \"#\" || a.Discrim) as name, cast(b.UserId as text) as owner, a.Xp as xp from Clubs a, DiscordUser b WHERE a.OwnerId = b.Id order by a.Xp desc;");
		if (!clubs)
			throw new Error("Unable to fetch clubs.");
		clubs = await Promise.all(clubs.map(async (club, rank) => {
			let levelInfo = await this.calcLevel(club.xp);
			club.level = levelInfo.level;
			club.levelXp = levelInfo.levelXp;
			club.requiredXp = levelInfo.requiredXp;
			club.rank = rank + 1;
			return club;
		}));
		return {
			clubs: clubs
		};
	}
}

module.exports = Connector;