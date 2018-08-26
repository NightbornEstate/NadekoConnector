var config = require("./config.json");
var server = require("./helpers/server.js");
var pkg = require("./package.json");

var startServers = async function () {
    let servers = [], ports = [];
    await Promise.all(config.bots.map(async function (bot) {
        let botServer = new server(bot);
        await botServer.initialize();
        servers.push(botServer);
        ports.push(botServer.port);
    }));
    console.log(`NadekoConnector ${pkg.version}`);
    console.log(`${pkg.description}`);
    console.log(`Listening on port${ports.length<2?"":"s"} ${ports.join(", ")}.`);
};

startServers();