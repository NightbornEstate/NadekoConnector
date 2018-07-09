//jshint esversion:6
var express = require('express');
var app = express();
var jwt = require("jsonwebtoken");
var config = require("./config.json");
var connector = require("./helpers/connector.js");
var utils = require('./helpers/utils.js');
var package = require('./package.json');

if (config.endpoints.getBalance === true) {
    app.use('/getbalance/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["userId"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.getBalance(obj.userId)
                .then((bal) => {
                    res.end(JSON.stringify({
                        balance: bal,
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.setBalance === true) {
    app.use('/setbalance/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["userId", "amount"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.setBalance(obj.userId, obj.amount)
                .then(() => {
                    res.end(JSON.stringify({
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.createTransaction === true) {
    app.use('/createtransaction/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["userId", "amount", "reason"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.createTransaction(obj.userId, obj.amount, obj.reason)
                .then(() => {
                    res.end(JSON.stringify({
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.getGuildXp === true) {
    app.use('/getguildxp/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["userId", "guildId"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.getGuildXp(obj.userId, obj.guildId)
                .then((xp) => {
                    let levelInfo = utils.calcLevel(xp[0] + xp[1]);
                    res.end(JSON.stringify({
                        guildxp: xp[0],
                        awardedxp: xp[1],
                        totalxp: xp[0] + xp[1],
                        level: levelInfo.level,
                        currentLevelXp: levelInfo.currentLevelXp,
                        nextLevelXp: levelInfo.nextLevelXp,
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.setGuildXp === true) {
    app.use('/setguildxp/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["userId", "guildId", "amount"].sort();
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.setGuildXp(obj.userId, obj.guildId, obj.amount)
                .then(() => {
                    res.end(JSON.stringify({
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.getXpLeaderboard === true) {
    app.use('/getxpleaderboard/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["guildId", "startPosition", "items"].sort();
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.getXpLeaderboard(obj.guildId, obj.startPosition, obj.items)
                .then((xpLeaderboard) => {
                    res.end(JSON.stringify({
                        leaderboard: xpLeaderboard,
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.getXpRoleRewards === true) {
    app.use('/getxprolerewards/:token', function (req, res) {
        try {
            console.log(Object.keys(req));
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["guildId"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.getXpRoleRewards(obj.guildId)
                .then((roleRewards) => {
                    res.end(JSON.stringify({
                        xpRoleRewards: roleRewards,
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

if (config.endpoints.getXpCurrencyRewards === true) {
    app.use('/getxpcurrencyrewards/:token', function (req, res) {
        try {
            let obj = jwt.verify(req.params.token, config.password);
            let requiredKeys = ["guildId"];
            let keys = Object.keys(obj).sort();
            if (!requiredKeys.every(val => keys.includes(val))) {
                throw new Error("Invalid properties specified.");
            }
            connector.getXpCurrencyRewards(obj.guildId)
                .then((roleRewards) => {
                    res.end(JSON.stringify({
                        xpRoleRewards: roleRewards,
                        success: true
                    }));
                });
        } catch (e) {
            let errormsg = {
                error: "Invalid token. ",
                success: false
            };
            if (e.message !== null)
                errormsg.error = e.message;
            res.end(JSON.stringify(errormsg));
            console.error(errormsg);
        }
    });
}

app.use('/getbotinfo', function (req, res) {
    try {
        utils.getBotInfo()
            .then((info) => {
                res.end(JSON.stringify({
                    bot: info,
                    success: true
                }));
            });
    } catch (e) {
        let errormsg = {
            error: "Invalid token. ",
            success: false
        };
        if (e.message !== null)
            errormsg.error = e.message;
        res.end(JSON.stringify(errormsg));
        console.error(errormsg);
    }
});

app.listen(config.port, () => {
    console.log(`\nNadekoConnector ${package.version}`);
    console.log(`\nExposes parts of the NadekoBot database for modification through JSONWebTokens.`);
    console.log(`\nActive endpoints: ${utils.getActiveEndpoints()}`);
    console.log(`\nListening at http://${utils.getIpAddress()}:${config.port}/`);
});