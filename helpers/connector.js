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
			"subtractCurrency",
			"createTransaction",
			"getTransactions",
			"getGuildRank",
			"getGuildXp",
			"setGuildXp",
			"addGuildXp",
			"subtractGuildXp",
			"awardGuildXp",
			"getGuildXpLeaderboard",
			"getGuildXpRoleRewards",
			"getGuildXpCurrencyRewards",
			"getGlobalRank",
			"getGlobalXp",
			"getGlobalXpLeaderboard",
			"getClubLeaderboard",
			"getClubInfo",
			"getClubInfoByUser",
			"getClubMembers"];

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
			"getClubLeaderboard",
			"getClubInfo",
			"getClubInfoByUser",
			"getClubMembers"];

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
	 * Check if currency amount is properly specified.
	 * @param {String} currency Currency amount.
	 */
	async checkIfValidCurrency(currency) {
		if (typeof currency !== "number")
			throw new Error("Currency amount must be a number.");
		if (currency >= Number.MAX_SAFE_INTEGER || currency <= Number.MIN_SAFE_INTEGER)
			throw new Error("Currency amount exceeds maximum safe integer limits.");
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
		if (!info || (Array.isArray(info) && info.length < 1))
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
		await this.checkIfValidCurrency(currency);
		let updatedRows = await this.db.from("DiscordUser").update({ CurrencyAmount: currency }).where({ UserId: userId });
		if (updatedRows < 1)
			throw new Error("Unable to update currency.");
		return {
			userId: userId,
			currency: currency
		};
	}

	/**
	 * Add currency to a user.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} currency Currency amount to be added.
	 * @param {String} reason Reason for the transaction.
	 * @returns {Object} Balance info about the specified user.
	 */
	async addCurrency(userId, currency, reason) {
		await this.checkEndpoint("addCurrency");
		await this.checkIfUserExists(userId);
		await this.checkIfValidCurrency(currency);
		await this.db.raw(`update DiscordUser set CurrencyAmount =  CurrencyAmount + ${Math.abs(currency)} where UserId = ${userId}`);
		let userTransactionCreated = await this.createTransaction(userId, Math.abs(currency), reason);
		if (!userTransactionCreated)
			throw new Error("Unable to create a currency transaction for the user.");
		if (userId !== this.credentials.ClientId)
			await this.subtractCurrency(this.credentials.ClientId, currency, reason);
		return await this.getCurrency(userId);
	}

	/**
	 * Subtract currency from a user.
	 * @param {String} userId ID of the Discord user.
	 * @param {Number} currency Currency amount to be subtracted.
	 * @param {String} reason Reason for the transaction.
	 * @returns {Object} Balance info about the specified user.
	 */
	async subtractCurrency(userId, currency, reason) {
		await this.checkEndpoint("subtractCurrency");
		await this.checkIfUserExists(userId);
		await this.checkIfValidCurrency(currency);
		let { currency: oldCurrency } = await this.getCurrency(userId);
		if (Math.abs(currency) > oldCurrency && userId !== this.credentials.ClientId)
			throw new Error("User does not have the specified currency.");
		await this.db.raw(`update DiscordUser set CurrencyAmount =  CurrencyAmount - ${Math.abs(currency)} where UserId = ${userId}`);
		let userTransactionCreated = await this.createTransaction(userId, -1 * Math.abs(currency), reason);
		if (!userTransactionCreated)
			throw new Error("Unable to create a currency transaction for the user.");
		if (userId !== this.credentials.ClientId)
			await this.addCurrency(this.credentials.ClientId, currency, reason);
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
		await this.checkIfValidCurrency(currency);
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
		if (!transactions || (Array.isArray(transactions) && transactions.length < 1))
			throw new Error("User not found.");
		return transactions;
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
		if (!guildRankings || (Array.isArray(guildRankings) && guildRankings.length < 1))
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
	 * Add guild XP to a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @param {String} xp XP to be added.
	 * @returns {Object} Information about the user's guild XP.
	 */
	async addGuildXp(userId, guildId, xp) {
		await this.checkEndpoint("addGuildXp");
		await this.checkIfUserExists(userId);
		await this.checkIfGuildExists(guildId);
		await this.db.raw(`update UserXpStats set AwardedXp = AwardedXp + ${Math.abs(xp)} where UserId = ${userId} and GuildId = ${guildId}`);
		return await this.getGuildXp(userId, guildId);
	}

	/**
	 * Subtract guild XP from a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @param {String} xp XP to be subtracted.
	 * @returns {Object} Information about the user's guild XP.
	 */
	async subtractGuildXp(userId, guildId, xp) {
		await this.checkEndpoint("subtractGuildXp");
		await this.checkIfUserExists(userId);
		await this.checkIfGuildExists(guildId);
		await this.db.raw(`update UserXpStats set AwardedXp = AwardedXp - ${Math.abs(xp)} where UserId = ${userId} and GuildId = ${guildId}`);
		return await this.getGuildXp(userId, guildId);
	}

	/**
	 * Award guild XP to a Discord user.
	 * @param {String} userId ID of the Discord user.
	 * @param {String} guildId ID of the Discord guild.
	 * @param {String} xp XP to be awarded.
	 * @returns {Object} Information about the user's guild XP.
	 */
	async awardGuildXp(userId, guildId, xp) {
		await this.checkEndpoint("awardGuildXp");
		return xp > 0 ? await this.addGuildXp(userId, guildId, xp) : await this.subtractGuildXp(userId, guildId, xp);
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
		if (!leaderboard || (Array.isArray(leaderboard) && leaderboard.length < 1))
			throw new Error("Unable to fetch guild XP leaderboard.");
		return await Promise.all(leaderboard.map(async (user, rank) => {
			let levelInfo = await this.calcLevel(user.xp + user.awardedXp);
			user.level = levelInfo.level;
			user.levelXp = levelInfo.levelXp;
			user.requiredXp = levelInfo.requiredXp;
			user.rank = startPosition + rank + 1;
			return user;
		}));
	}

	/**
	 * Get XP role rewards of a Discord guild.
	 * @param {String} guildId ID of the guild to get XP role rewards of.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Role rewards page.
	 */
	async getGuildXpRoleRewards(guildId, startPosition = 0, items = 10) {
		await this.checkEndpoint("getGuildXpRoleRewards");
		await this.checkIfGuildExists(guildId);
		let rewards = await this.db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', cast (a.RoleId as text) as 'roleId' from XpRoleReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc limit ${items} offset ${startPosition}`);
		if (!rewards || (Array.isArray(rewards) && rewards.length < 1))
			throw new Error("Unable to fetch role rewards.");
		return rewards;
	}

	/**
	 * Get XP currency rewards of a Discord guild.
	 * @param {String} guildId ID of the guild to get XP currency rewards of.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Currency rewards page.
	 */
	async getGuildXpCurrencyRewards(guildId, startPosition = 0, items = 10) {
		await this.checkEndpoint("getGuildXpCurrencyRewards");
		await this.checkIfGuildExists(guildId);
		let rewards = await this.db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', a.Amount as 'amount' from XpCurrencyReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc limit ${items} offset ${startPosition}`);
		if (!rewards || (Array.isArray(rewards) && rewards.length < 1))
			throw new Error("Unable to fetch currency rewards.");
		return rewards;
	}

	/**
	 * Get global ranking of a Discord user.
	 * @param {String} userId ID of the user to get global ranking of.
	 * @returns {Object} Rank info.
	 */
	async getGlobalRank(userId) {
		await this.checkEndpoint("getGlobalRank");
		await this.checkIfUserExists(userId);
		let globalRankings = await this.db.raw("select cast(UserId as text) as 'id' from DiscordUser order by TotalXp desc").map(user => user.id);
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
		let [{ globalXp }] = await this.db.raw(`select TotalXp as 'globalXp' from DiscordUser where UserId=${userId}`);
		if (!globalXp || (Array.isArray(globalXp) && globalXp.length < 1))
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
		let leaderboard = await this.db.raw(`select cast(UserId as text) as 'userId', TotalXp as 'globalXp' from DiscordUser order by TotalXp desc limit ${items} offset ${startPosition}`);
		if (!leaderboard || (Array.isArray(leaderboard) && leaderboard.length < 1))
			throw new Error("Unable to fetch global XP leaderboard.");
		return await Promise.all(leaderboard.map(async (user, rank) => {
			let levelInfo = await this.calcLevel(user.globalXp);
			user.level = levelInfo.level;
			user.levelXp = levelInfo.levelXp;
			user.requiredXp = levelInfo.requiredXp;
			user.rank = startPosition + rank + 1;
			return user;
		}));
	}

	/**
	 * Get club leaderboard.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Leaderboard page.
	 */
	async getClubLeaderboard(startPosition = 0, items = 10) {
		await this.checkEndpoint("getClubLeaderboard");
		let clubs = await this.db.raw(`select (a.Name || "#" || a.Discrim) as name, cast(b.UserId as text) as owner, a.Xp as xp, a.ImageUrl as icon, a.MinimumLevelReq as levelRequirement, a.Description as description from Clubs a, DiscordUser b WHERE a.OwnerId = b.Id order by a.Xp desc limit ${items} offset ${startPosition}`);
		if (!clubs || (Array.isArray(clubs) && clubs.length < 1))
			throw new Error("Unable to fetch clubs.");
		return await Promise.all(clubs.map(async (club, rank) => {
			let levelInfo = await this.calcLevel(club.xp);
			club.level = levelInfo.level;
			club.levelXp = levelInfo.levelXp;
			club.requiredXp = levelInfo.requiredXp;
			club.rank = rank + 1;
			return club;
		}));
	}

	/**
	 * Get club information by name.
	 * @param {Number} name Name of the club.
	 * @returns {Object} Information about the club.
	 */
	async getClubInfo(name) {
		await this.checkEndpoint("getClubInfo");
		let clubs = await this.db.raw(`select(a.Name || "#" || a.Discrim) as clubName, cast(b.UserId as text) as owner, a.Xp as xp, a.ImageUrl as icon, a.MinimumLevelReq as levelRequirement, a.Description as description from Clubs a, DiscordUser b WHERE a.OwnerId = b.Id AND clubName = "${name}"`);
		if (!clubs || (Array.isArray(clubs) && clubs.length < 1))
			throw new Error("No clubs exist with the specified name.");
		let levelInfo = await this.calcLevel(clubs[0].xp);
		if (!levelInfo)
			throw new Error("Unable to calculate level info.");
		let rankings = await this.db.raw("select (Name || \"#\" || Discrim) as name from Clubs order by Xp desc").map(club => club.name);
		if (!rankings || (Array.isArray(rankings) && rankings.length < 1))
			throw new Error("Unable to get club ranking.");
		let rank = rankings.indexOf(name) < 0 ? rankings.length : rankings.indexOf(name) + 1;
		return {
			name: clubs[0].clubName,
			owner: clubs[0].owner,
			description: clubs[0].description,
			icon: clubs[0].icon,
			xp: clubs[0].xp,
			level: levelInfo.level,
			levelXp: levelInfo.levelXp,
			requiredXp: levelInfo.requiredXp,
			rank: rank,
			levelRequirement: clubs[0].levelRequirement
		};
	}

	/**
	 * Get club information by club member.
	 * @param {Number} userId ID of the club member.
	 * @returns {Object} Information about the club.
	 */
	async getClubInfoByUser(userId) {
		await this.checkEndpoint("getClubInfoByUser");
		await this.checkIfUserExists(userId);
		let club = await this.db.raw(`select(a.Name || "#" || a.Discrim) as clubName from Clubs a, DiscordUser b WHERE b.ClubId = a.Id AND b.UserId = ${userId}`);
		if (!club || (Array.isArray(club) && club.length < 0))
			throw new Error("Club not found.");
		return await this.getClubInfo(club[0].clubName);
	}

	/**
	 * Get club members by name.
	 * @param {Number} name Name of the club.
	 * @param {Number} startPosition Start position/offset of the page.
	 * @param {Number} items Items per page.
	 * @returns {Object} Members page.
	 */
	async getClubMembers(name, startPosition = 0, items = 10) {
		await this.checkEndpoint("getClubMembers");
		let members = await this.db.raw(`select cast(a.UserId as text) as userId, a.TotalXp as xp, a.IsClubAdmin as admin from DiscordUser a, Clubs b where a.ClubId = b.Id AND (b.Name || "#" || b.Discrim)="${name}" order by xp desc limit ${items} offset ${startPosition}`);
		if (!members || (Array.isArray(members) && members.length < 0))
			throw new Error("No members found.");
		return await Promise.all(members.map(async (member, rank) => {
			let levelInfo = await this.calcLevel(member.xp);
			return {
				userId: member.userId,
				admin: member.admin > 0 ? true : false,
				xp: member.xp,
				level: levelInfo.level,
				levelXp: levelInfo.levelXp,
				rank: rank + 1,
			};
		}));
	}
}

module.exports = Connector;