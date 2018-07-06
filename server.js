//jshint esversion:6
var express = require('express');
var app = express();
var jwt = require("jsonwebtoken");
var config = require("./config.json");
var sqlite_connector = require("./helpers/sqlite_connector");
var utils = require('./utils.js');

app.use('/getbal/:token', function (req, res) {
    try {
        let obj = jwt.verify(req.params.token, config.jwt_secret);
        let requiredKeys = ["uid"];
        let keys = Object.keys(obj).sort();
        if (keys !== requiredKeys) {
            throw new Error("Invalid properties specified. ");
        }
        sqlite_connector.getBal(obj.uid)
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

app.use('/setbal/:token', function (req, res) {
    try {
        let obj = jwt.verify(req.params.token, config.jwt_secret);
        let requiredKeys = ["uid", "amount"];
        let keys = Object.keys(obj).sort();
        if (keys !== requiredKeys) {
            throw new Error("Invalid properties specified. ");
        }
        sqlite_connector.updateBal(obj.uid, obj.amount)
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

app.use('/addtransaction/:token', function (req, res) {
    try {
        let obj = jwt.verify(req.params.token, config.jwt_secret);
        let requiredKeys = ["uid", "amount", "reason"];
        let keys = Object.keys(obj).sort();
        if (keys !== requiredKeys) {
            throw new Error("Invalid properties specified. ");
        }
        sqlite_connector.addTransaction(obj.uid, obj.amount, obj.reason)
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

app.use('/getguildxp/:token', function (req, res) {
    try {
        let obj = jwt.verify(req.params.token, config.jwt_secret);
        let requiredKeys = ["uid", "guildId"];
        let keys = Object.keys(obj).sort();
        if (keys !== requiredKeys) {
            throw new Error("Invalid properties specified. ");
        }
        sqlite_connector.getGuildXp(obj.uid, obj.guildId)
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

app.use('/updateguildxp/:token', function (req, res) {
    try {
        let obj = jwt.verify(req.params.token, config.jwt_secret);
        let requiredKeys = ["uid", "guildId", "amount"].sort();
        let keys = Object.keys(obj).sort();
        if (keys !== requiredKeys) {
            throw new Error("Invalid properties specified. ");
        }
        sqlite_connector.updateGuildXp(obj.uid, obj.guildId, obj.amount)
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

app.listen(config.port, () => console.log("NadekoConnector listening at port " + config.port + "."));