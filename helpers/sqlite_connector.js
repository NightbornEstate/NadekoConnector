//jshint esversion:6
var sqlite3 = require('sqlite3');
var config = require('../config.json');
var path = require('path');
var leftPad = require('left-pad');
var pad = (num) => leftPad(num, 2, 0);

var getBal = function (uid) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.get("SELECT * FROM DiscordUser WHERE UserId = $uid", {
                $uid: uid
            }, function (err, row) {
                resolve(row.CurrencyAmount);
            });
        });
        db.close();
    });
};

var updateBal = function (uid, amount) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("UPDATE DiscordUser SET CurrencyAmount = $amount WHERE UserId = $uid", {
                $uid: uid,
                $amount: amount
            });
            resolve();
        });
        db.close();
    });
};

var addTransaction = function (uid, amount, reason) {
    let now = new Date();
    let date = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) + ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds() + '.' + pad(now.getUTCMilliseconds()));
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("INSERT INTO CurrencyTransactions values((SELECT MAX(a.Id) FROM CurrencyTransactions a)+1, $amount, $reason, $uid, $date)", {
                $date: date,
                $uid: uid,
                $reason: reason,
                $amount: amount
            });
            resolve();
        });
        db.close();
    });
};

var getGuildXp = function (uid, guildId) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.get("SELECT * FROM UserXpStats WHERE UserId = $uid AND GuildId = $guildid", {
                $uid: uid,
                $guildid: guildId
            }, function (err, row) {
                resolve([row.Xp, row.AwardedXp]);
            });
        });
        db.close();
    });
};

var updateGuildXp = function (uid, guildId, xp) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("UPDATE UserXpStats SET AwardedXp = $xp WHERE UserId = $uid AND GuildId = $guildid", {
                $guildid: guildId,
                $uid: uid,
                $xp: xp
            });
            resolve();
        });
        db.close();
    });
};


// untested code vvv
var getXpLeaderboard = function (guildId, itemPosition, itemsPerPage) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.all("SELECT UserId, Xp, AwardedXp FROM UserXpStats WHERE GuildId=$guildId ORDER BY (Xp+AwardedXp) DESC;", {
                $guildId: guildId
            }, function (err, rows) {
                let rowSelection = rows.slice((itemPosition-1), (itemPosition+itemsPerPage-1));
                resolve(rowSelection);
            });
        });
        db.close();
    });
};
// untested code ^^^

exports.getBal = getBal;
exports.updateBal = updateBal;
exports.addTransaction = addTransaction;
exports.getGuildXp = getGuildXp;
exports.updateGuildXp = updateGuildXp;
exports.getXpLeaderboard = getXpLeaderboard;