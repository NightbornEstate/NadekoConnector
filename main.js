const config = require("./config.json");
const server = require("./helpers/server.js");
const pkg = require("./package.json");

const startServers = async () => {
	const servers = [], ports = [];
	await Promise.all(config.bots.map(async function (bot) {
		const botServer = new server(bot);
		await botServer.initialize();
		servers.push(botServer);
		ports.push(botServer.port);
	}));
	console.log(`NadekoConnector ${pkg.version}`);
	console.log(`${pkg.description}`);
	console.log(`Listening on port${ports.length<2?"":"s"} ${ports.join(", ")}.`);
};

startServers();