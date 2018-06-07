var sqlite3 = require('sqlite3');
var config = require('../config.json');
var path = require('path');
var leftPad = require('left-pad');
var pad = (num) => leftPad(num, 2, 0);

module.exports.getBal = function (uid) {
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
                resolve(row.CurrencyAmount)
            })
        })
        db.close();
    })
}

module.exports.updateBal = function (uid, amount) {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("UPDATE DiscordUser SET CurrencyAmount = ? WHERE UserId = ?2", {
                2: uid,
                1: amount
            })
            resolve()
        })
        db.close();
    })
}

module.exports.addTransaction = function (uid, amount, reason) {
    let now = new Date();
    let date = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) + ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()+ '.' + pad(now.getUTCMilliseconds()));
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.run("INSERT INTO CurrencyTransactions values((SELECT MAX(a.Id) FROM CurrencyTransactions a)+1, ?1, ?2, ?3, ?4)", {
                4: date,
                3: uid,
                2: reason,
                1: amount
            })
            resolve()
        })
        db.close();
    })
}

module.exports.getGuildXp = function (uid, guildId) {
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
                resolve([row.Xp, row.AwardedXp])
            })
        })
        db.close();
    })
}