//jshint esversion:6
var sqlite3 = require('sqlite3');
var config = require('../config.json');
var path = require('path');
var leftPad = require('left-pad');
var pad = (num) => leftPad(num, 2, 0);

var getBalance = function (userId) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.get("SELECT * FROM DiscordUser WHERE UserId = $userId", {
                $userId: userId
            }, function (err, row) {
                resolve(row.CurrencyAmount);
            });
        });
        db.close();
    });
};

var setBalance = function (userId, amount) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("UPDATE DiscordUser SET CurrencyAmount = $amount WHERE UserId = $userId", {
                $userId: userId,
                $amount: amount
            });
            resolve();
        });
        db.close();
    });
};

var createTransaction = function (userId, amount, reason) {
    let now = new Date();
    let date = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) + ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds() + '.' + pad(now.getUTCMilliseconds()));
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("INSERT INTO CurrencyTransactions VALUES((SELECT MAX(a.Id) FROM CurrencyTransactions a) + 1, $amount, $reason, $userId, $date)", {
                $date: date,
                $userId: userId,
                $reason: reason,
                $amount: amount
            });
            resolve();
        });
        db.close();
    });
};

var getGuildXp = function (userId, guildId) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.get("SELECT * FROM UserXpStats WHERE UserId = $userId AND GuildId = $guildid", {
                $userId: userId,
                $guildid: guildId
            }, function (err, row) {
                resolve([row.Xp, row.AwardedXp]);
            });
        });
        db.close();
    });
};

var setGuildXp = function (userId, guildId, xp) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("UPDATE UserXpStats SET Xp = $xp WHERE UserId = $userId AND GuildId = $guildid", {
                $guildid: guildId,
                $userId: userId,
                $xp: xp
            });
            resolve();
        });
        db.close();
    });
};

var getXpLeaderboard = function (guildId, startPosition, items) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.all("SELECT UserId, Xp, AwardedXp FROM UserXpStats WHERE GuildId = $guildId ORDER BY (Xp + AwardedXp) DESC;", {
                $guildId: guildId
            }, function (err, rows) {
                let rowSelection = rows.slice((startPosition - 1), (startPosition + items - 1));
                let formattedRows = [];
                rowSelection.forEach((row) => {
                    formattedRows.push({
                        userId: rowSelection.UserId,
                        guildXp: rowSelection.Xp,
                        awardedXp: rowSelection.AwardedXp,
                        totalXp: rowSelection.Xp + rowSelection.AwardedXp
                    });
                });
                resolve(formattedRows);
            });
        });
        db.close();
    });
};

var getXpRoleRewards = function (guildId) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.all("SELECT a.DateAdded, a.Level, a.RoleId FROM XpRoleReward a, XpSettings b, GuildConfigs c WHERE a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = $guildId ORDER BY a.Level ASC;", {
                $guildId: guildId
            }, function (err, rows) {
                let formattedRows = [];
                rows.forEach((row) => {
                    formattedRows.push({
                        level: row.Level,
                        roleId: row.RoleId,
                        dateAdded: row.DateAdded
                    });
                });
                resolve(formattedRows);
            });
        });
        db.close();
    });
};

var getXpCurrencyRewards = function (guildId) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.all("SELECT a.DateAdded, a.Level, a.Amount FROM XpCurrencyReward a, XpSettings b, GuildConfigs c WHERE a.XpSettingsId = b.Id AND b.GuildConfigId = c.Id AND c.GuildId = $guildId ORDER BY a.Level ASC;", {
                $guildId: guildId
            }, function (err, rows) {
                let formattedRows = [];
                rows.forEach((row) => {
                    formattedRows.push({
                        level: row.Level,
                        amount: row.Amount,
                        dateAdded: row.DateAdded
                    });
                });
                resolve(formattedRows);
            });
        });
        db.close();
    });
};

exports.getBalance = getBalance;
exports.setBalance = setBalance;
exports.createTransaction = createTransaction;
exports.getGuildXp = getGuildXp;
exports.setGuildXp = setGuildXp;
exports.getXpLeaderboard = getXpLeaderboard;
exports.getXpRoleRewards = getXpRoleRewards;
exports.getXpCurrencyRewards = getXpCurrencyRewards;