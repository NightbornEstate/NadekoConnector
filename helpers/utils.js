//jshint esversion:6
var config = require('../config.json');
var credentials = require(config.bot.credentials);
var sqlite3 = require('sqlite3');
var os = require('os');
var path = require('path');

var getBotInfo = function () {
    return new Promise(function (resolve, reject) {
        let db = new sqlite3.Database(path.join(config.bot.db), (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        db.serialize(() => {
            db.get("SELECT CurrencySign, CurrencyName, CurrencyPluralName, XpPerMessage, XpMinutesTimeout FROM BotConfig;", [], function (err, row) {
                let info = {
                    id: credentials.ClientId,
                    ownerIds: credentials.OwnerIds,
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
                resolve(info);
            });
        });
        db.close();
    });
};

var calcLevel = (xp) => {
    let lvl = 0,
        gap = 0;
    for (var i in [...Array(1000).keys()]) {
        gap = 36 + (9 * i);
        if (xp >= gap) {
            xp -= gap;
            lvl++;
        }
        if (xp < gap)
            break;
    }
    return {
        level: lvl,
        currentLevelXp: xp,
        nextLevelXp: gap
    };
};

var getIpAddress = function () {
    let ifaces = os.networkInterfaces();
    let ipAddress;
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                return;
            }
            if (iface.address !== null && iface.address !== undefined)
                ipAddress = iface.address;
        });
    });
    return ipAddress;
};

var getActiveEndpoints = function () {
    let endpointList = ["\n- getBotInfo"];
    if (config.endpoints.getBalance)
        endpointList.push("getBalance");
    if (config.endpoints.setBalance)
        endpointList.push("setBalance");
    if (config.endpoints.createTransaction)
        endpointList.push("createTransaction");
    if (config.endpoints.getGuildXp)
        endpointList.push("getGuildXp");
    if (config.endpoints.setGuildXp)
        endpointList.push("setGuildXp");
    if (config.endpoints.getXpLeaderboard)
        endpointList.push("getXpLeaderboard");
    if (config.endpoints.getXpRoleRewards)
        endpointList.push("getXpRoleRewards");
    if (config.endpoints.getXpCurrencyRewards)
        endpointList.push("getXpCurrencyRewards");
    return endpointList.join("\n- ");
};

exports.getBotInfo = getBotInfo;
exports.calcLevel = calcLevel;
exports.getIpAddress = getIpAddress;
exports.getActiveEndpoints = getActiveEndpoints;