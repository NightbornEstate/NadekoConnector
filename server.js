var express = require('express');
var app = express();
var jwt = require("jsonwebtoken");
var config = require("./config.json");
var sqlite_connector = require("./helpers/sqlite_connector");

app.use('/getbal/:token', function (req, res) {
    try {
        let j = jwt.verify(req.params.token, config.jwt_secret);
        let uid = j.uid;
        sqlite_connector.getBal(uid)
            .then((bal) => {
                res.end(JSON.stringify({
                    balance: bal
                }));
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}");
        console.log(e);
    }
});

app.use('/setbal/:token', function (req, res) {
    try {
        let j = jwt.verify(req.params.token, config.jwt_secret);
        let uid = j.uid;
        sqlite_connector.updateBal(uid, j.amount)
            .then(() => {
                res.end(JSON.stringify({
                    success: true
                }))
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}")
    }
});

app.use('/addtransaction/:token', function (req, res) {
    try {
        let j = jwt.verify(req.params.token, config.jwt_secret);
        let uid = j.uid;
        let amount = j.amount;
        let reason = j.reason;
        sqlite_connector.addTransaction(uid, amount, reason)
            .then(() => {
                res.end(JSON.stringify({
                    success: true
                }))
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}")
    }
});

app.use('/getguildxp/:token', function (req, res) {
    try {
        let j = jwt.verify(req.params.token, config.jwt_secret);
        let uid = j.uid;
        let guildId = j.guildId;
        sqlite_connector.getGuildXp(uid, guildId)
            .then((xp) => {
                res.end(JSON.stringify({
                    guildxp: xp[0],
                    awardedxp: xp[1],
                    totalxp: xp[0]+xp[1]
                }))
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}")
    }
});

app.listen(3000, () => console.log("NadekoConnector listening at port 3000."));