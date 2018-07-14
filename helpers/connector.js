var sqlite3 = require("sqlite3");
var config = require("../config.json");
var credentials = require(config.bot.credentials);
var path = require("path");
var leftPad = require("left-pad");
var utils = require("./utils.js");
var pad = (num) => leftPad(num, 2, 0);

var getBotInfo = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.get("SELECT CurrencySign, CurrencyName, CurrencyPluralName, XpPerMessage, XpMinutesTimeout FROM BotConfig;", [], function (err, row) {
					let info = {
						id: credentials.ClientId,
						owners: credentials.OwnerIds,
						currency: {
							sign: row.CurrencySign,
							name: row.CurrencyName,
							pluralName: row.CurrencyPluralName
						},
						xp: {
							perMessage: row.XpPerMessage,
							interval: row.XpMinutesTimeout
						}
					};
					resolve(utils.success({ bot: info }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getBalance = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.get("SELECT * FROM DiscordUser WHERE UserId = $userId", {
					$userId: data.userId
				}, function (err, row) {
					resolve(utils.success({ balance: row.CurrencyAmount }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var setBalance = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.run("UPDATE DiscordUser SET CurrencyAmount = $amount WHERE UserId = $userId", {
					$userId: data.userId,
					$amount: data.amount
				});
				db.get("SELECT * FROM DiscordUser WHERE UserId = $userId", {
					$userId: data.userId
				}, function (err, row) {
					resolve(utils.success({ balance: row.CurrencyAmount }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var createTransaction = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				let now = new Date();
				let date = [now.getUTCFullYear(), pad(now.getUTCMonth() + 1), pad(now.getUTCDate())].join("-");
				let time = pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds() + "." + pad(now.getUTCMilliseconds()));
				date += " " + time;
				db.run("INSERT INTO CurrencyTransactions VALUES((SELECT MAX(a.Id) FROM CurrencyTransactions a) + 1, $amount, $reason, $userId, $date)", {
					$date: date,
					$userId: data.userId,
					$reason: data.reason,
					$amount: data.amount
				});
				resolve(utils.success());
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getTransactions = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT Amount, Reason, DateAdded FROM CurrencyTransactions WHERE UserId = $userId ORDER BY Id DESC LIMIT $items OFFSET $startPosition;", {
					$userId: data.userId,
					$startPosition: data.startPosition,
					$items: data.items
				}, function (err, rows) {
					resolve(utils.success({ transactions: rows }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getGuildXp = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.get("SELECT * FROM UserXpStats WHERE UserId = $userId AND GuildId = $guildid;", {
					$userId: data.userId,
					$guildid: data.guildId
				}, function (err, row) {
					let levelInfo = utils.calcLevel(row.Xp + row.AwardedXp);
					resolve(utils.success({
						guildXp: row.Xp,
						awardedXp: row.AwardedXp,
						totalXp: row.Xp + row.AwardedXp,
						level: levelInfo.level,
						currentLevelXp: levelInfo.currentLevelXp,
						nextLevelXp: levelInfo.nextLevelXp
					}));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var setGuildXp = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.run("UPDATE UserXpStats SET Xp = $xp, AwardedXp = $awardedXp WHERE UserId = $userId AND GuildId = $guildid;", {
					$guildid: data.guildId,
					$userId: data.userId,
					$xp: data.xp,
					$awardedXp: data.awardedXp
				});
				db.get("SELECT Xp, AwardedXp FROM UserXpStats WHERE UserId = $userId AND GuildId = $guildid;", {
					$userId: data.userId,
					$guildid: data.guildId
				}, function (err, row) {
					let levelInfo = utils.calcLevel(row.Xp + row.AwardedXp);
					resolve(utils.success({
						guildXp: row.Xp,
						awardedXp: row.AwardedXp,
						totalXp: row.Xp + row.AwardedXp,
						level: levelInfo.level,
						currentLevelXp: levelInfo.currentLevelXp,
						nextLevelXp: levelInfo.nextLevelXp
					}));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getGuildXpLeaderboard = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT UserId, Xp, AwardedXp FROM UserXpStats WHERE GuildId = $guildId ORDER BY (Xp + AwardedXp) DESC LIMIT $items OFFSET $startPosition;", {
					$guildId: data.guildId,
					$startPosition: data.startPosition,
					$items: data.items
				}, function (err, rows) {
					let formattedRows = [];
					rows.forEach((row) => {
						let levelInfo = utils.calcLevel(row.Xp + row.AwardedXp);
						formattedRows.push({
							userId: row.UserId,
							guildXp: row.Xp,
							awardedXp: row.AwardedXp,
							totalXp: row.Xp + row.AwardedXp,
							level: levelInfo.level,
							currentLevelXp: levelInfo.currentLevelXp,
							nextLevelXp: levelInfo.nextLevelXp
						});
					});
					resolve(utils.success({ leaderboard: formattedRows }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getGlobalXpLeaderboard = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT DISTINCT (SELECT SUM(Xp) FROM UserXpStats a WHERE a.UserId = b.UserId) AS 'Xp', UserId FROM UserXpStats b ORDER BY Xp DESC LIMIT $items OFFSET $startPosition;", {
					$startPosition: data.startPosition,
					$items: data.items
				}, function (err, rows) {
					let formattedRows = [];
					rows.forEach((row) => {
						let levelInfo = utils.calcLevel(row.Xp);
						formattedRows.push({
							userId: row.UserId,
							xp: row.Xp,
							level: levelInfo.level,
							currentLevelXp: levelInfo.currentLevelXp,
							nextLevelXp: levelInfo.nextLevelXp
						});
					});
					resolve(utils.success({ leaderboard: formattedRows }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getGuildXpRoleRewards = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT a.DateAdded, a.Level, a.RoleId FROM XpRoleReward a, XpSettings b, GuildConfigs c WHERE a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = $guildId ORDER BY a.Level ASC;", {
					$guildId: data.guildId
				}, function (err, rows) {
					let formattedRows = [];
					rows.forEach((row) => {
						formattedRows.push({
							level: row.Level,
							roleId: row.RoleId,
							dateAdded: row.DateAdded
						});
					});
					resolve(utils.success({ roleRewards: formattedRows }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getGuildXpCurrencyRewards = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT a.DateAdded, a.Level, a.Amount FROM XpCurrencyReward a, XpSettings b, GuildConfigs c WHERE a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = $guildId ORDER BY a.Level ASC;", {
					$guildId: data.guildId
				}, function (err, rows) {
					let formattedRows = [];
					rows.forEach((row) => {
						formattedRows.push({
							level: row.Level,
							amount: row.Amount,
							dateAdded: row.DateAdded
						});
					});
					resolve(utils.success({ currencyRewards: formattedRows }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getTables = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all("SELECT * FROM sqlite_master WHERE type='table'", [], function (err, rows) {
					let tables = [];
					rows.forEach((row) => tables.push(row.name));
					resolve(utils.success({ tables: tables }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
};

var getFields = function (data) {
	return new Promise(function (resolve, reject) {
		let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
			if (err) {
				resolve(utils.failure({ error: err.message }));
			}
		});
		db.serialize(() => {
			try {
				db.all(`PRAGMA table_info(${data.tableName});`, [], function (err, rows) {
					let fields = [];
					rows.forEach((row) => {
						fields.push(row.name);
					});
					resolve(utils.success({ fields: fields }));
				});
			}
			catch (error) {
				resolve(utils.failure({ error: error.message }));
			}
		});
		db.close();
	});
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
exports.getGlobalXpLeaderboard = getGlobalXpLeaderboard;
exports.getGuildXpRoleRewards = getGuildXpRoleRewards;
exports.getGuildXpCurrencyRewards = getGuildXpCurrencyRewards;