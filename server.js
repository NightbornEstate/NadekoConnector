const express = require('express')
const jwt = require("jsonwebtoken");
const config = require("./config.json");
const sqlite_connector = require("./helpers/sqlite_connector");
const app = express()
const assert = require("assert");
const request = require('request');

app.get('/getbal/:token', (req, res) => {
    try {
        var j = jwt.verify(req.params.token, config.jwt_secret);
        var uid = j.uid;
        var tI = j.timeIssued;
        if (tI < (Date.now() - (1000 * 5))) return res.end("{\"error\": \"Your token was not valid\"}");
        sqlite_connector.getBal(uid)
            .then((bal) => {
                res.end(JSON.stringify({
                    balance: bal
                }));
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}")
    }
})
app.get('/setbal/:token', (req, res) => {
    try {
        var j = jwt.verify(req.params.token, config.jwt_secret);
        var uid = j.uid;
        var tI = j.timeIssued;
        if (tI < (Date.now() - (1000 * 5))) return res.end("{\"error\": \"Your token was not valid\"}");
        sqlite_connector.updateBal(uid, j.amount)
            .then(() => {
                res.end(JSON.stringify({
                    success: true
                }))
            })
    } catch (e) {
        res.end("{\"error\": \"Your token was not valid\"}")
    }
})

app.listen(3000, () => console.log('Listening on port 3000!'))
