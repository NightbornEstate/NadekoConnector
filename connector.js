var utils = require("./utils.js");
var config = utils.readJson("./config.json");
var credentials = utils.readJson(config.bot.credentials);
var db = require("knex")({
	client: "sqlite3",
	connection: {
		filename: config.bot.db
	},
	useNullAsDefault: true
});

var getBotInfo = async function ({ }) {
	try {
		let dbInfo = await db.first("CurrencySign", "CurrencyName", "CurrencyPluralName", "XpPerMessage", "XpMinutesTimeout").from("BotConfig");
		let info = {
			id: credentials.ClientId,
			owners: credentials.OwnerIds,
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
		return utils.success({ bot: info });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getTables = async function ({ }) {
	try {
		let tables = await db.select("name").from("sqlite_master").where({ type: "table" }).map(table => table.name);
		return utils.success({ tables: tables });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getFields = async function ({ table }) {
	try {
		let fields = await db.from(table).columnInfo();
		return utils.success({ fields: Object.keys(fields) });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getBalance = async function ({ userId }) {
	try {
		let info = await db.raw(`select cast(UserId as text) as 'userId', CurrencyAmount as 'balance' from DiscordUser where UserId = ${userId}`).first();
		return utils.success({ userId: info.userId, balance: info.CurrencyAmount });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var setBalance = async function ({ userId, balance }) {
	try {
		let updatedRows = await db.from("DiscordUser").update({ CurrencyAmount: balance }).where({ UserId: userId });
		if (updatedRows < 1)
			throw new Error("No rows updated.");
		return utils.success({ userId: userId, balance: balance });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var createTransaction = async function ({ userId, amount, reason }) {
	try {
		let { id } = await db.max({ id: "Id" }).from("CurrencyTransactions").first();
		let dateAdded = new Date().toISOString().replace("T", " ").replace("Z", "");
		await db.from("CurrencyTransactions").insert({ Id: ++id, UserId: userId, Amount: amount, Reason: reason, DateAdded: dateAdded });
		return utils.success({ transactionId: id, userId: userId });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getTransactions = async function ({ userId, startPosition, items }) {
	try {
		let transactions = await db.raw(`select Amount as 'amount', Reason as 'reason', DateAdded as 'dateAdded' from CurrencyTransactions where UserId = ${userId} order by Id desc limit ${items} offset ${startPosition}`);
		return utils.success({ transactions: transactions });
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGuildXp = async function ({ userId, guildId }) {
	try {
		let xpInfo = await db.first("Xp", "AwardedXp").from("UserXpStats").where({ UserId: userId, GuildId: guildId });
		let levelInfo = utils.calcLevel(xpInfo.Xp + xpInfo.AwardedXp);
		return utils.success({
			guildXp: xpInfo.Xp,
			awardedXp: xpInfo.AwardedXp,
			totalXp: xpInfo.Xp + xpInfo.AwardedXp,
			level: levelInfo.level,
			currentLevelXp: levelInfo.currentLevelXp,
			nextLevelXp: levelInfo.nextLevelXp
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var setGuildXp = async function ({ userId, guildId, awardedXp }) {
	try {
		let updatedRows = await db.from("UserXpStats").update({ AwardedXp: awardedXp }).where({ UserId: userId, GuildId: guildId });
		if (updatedRows < 1)
			throw new Error("No rows updated.");
		let xpInfo = await db.first("Xp", "AwardedXp").from("UserXpStats").where({ UserId: userId, GuildId: guildId });
		let levelInfo = utils.calcLevel(xpInfo.Xp + xpInfo.AwardedXp);
		return utils.success({
			guildXp: xpInfo.Xp,
			awardedXp: xpInfo.AwardedXp,
			totalXp: xpInfo.Xp + xpInfo.AwardedXp,
			level: levelInfo.level,
			currentLevelXp: levelInfo.currentLevelXp,
			nextLevelXp: levelInfo.nextLevelXp
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGlobalXp = async function ({ userId }) {
	try {
		let { globalXp } = await db.from("UserXpStats").where({ UserId: userId }).sum({ globalXp: "Xp" }).first();
		let levelInfo = utils.calcLevel(globalXp);
		return utils.success({
			globalXp: globalXp,
			level: levelInfo.level,
			currentLevelXp: levelInfo.currentLevelXp,
			nextLevelXp: levelInfo.nextLevelXp
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGuildXpLeaderboard = async function ({ guildId, startPosition, items }) {
	try {
		let leaderboard = await db.raw(`select cast(UserId as text) as 'userId', Xp as 'xp', AwardedXp as 'awardedXp' from UserXpStats where GuildId=${guildId} order by (xp + awardedXp) desc limit ${items} offset ${startPosition}`);
		return utils.success({
			leaderboard: leaderboard
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGlobalXpLeaderboard = async function ({ startPosition, items }) {
	try {
		let leaderboard = await db.raw(`select cast (UserId as text) as 'userId', sum (Xp) as 'xp' from UserXpStats group by UserId order by xp desc limit ${items} offset ${startPosition}`);
		return utils.success({
			leaderboard: leaderboard
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGuildXpRoleRewards = async function ({ guildId, startPosition, items }) {
	try {
		let rewards = await db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', cast (a.RoleId as text) as 'roleId' from XpRoleReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc limit ${items} offset ${startPosition}`);
		return utils.success({
			leaderboard: rewards
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

var getGuildXpCurrencyRewards = async function ({ guildId, startPosition, items }) {
	try {
		let rewards = await db.raw(`select a.DateAdded as 'dateAdded', a.Level as 'level', a.Amount as 'amount' from XpCurrencyReward a, XpSettings b, GuildConfigs c where a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = ${guildId} order by a.Level asc limit ${items} offset ${startPosition}`);
		return utils.success({
			leaderboard: rewards
		});
	} catch (error) {
		return utils.failure({ error: error.message });
	}
};

exports.getBotInfo = getBotInfo;
exports.getTables = getTables;
exports.getFields = getFields;
exports.getBalance = getBalance;
exports.setBalance = setBalance;
exports.createTransaction = createTransaction;
exports.getTransactions = getTransactions;
exports.getGuildXp = getGuildXp;
exports.setGuildXp = setGuildXp;
exports.getGuildXpLeaderboard = getGuildXpLeaderboard;
exports.getGuildXpRoleRewards = getGuildXpRoleRewards;
exports.getGuildXpCurrencyRewards = getGuildXpCurrencyRewards;
exports.getGlobalXp = getGlobalXp;
exports.getGlobalXpLeaderboard = getGlobalXpLeaderboard;