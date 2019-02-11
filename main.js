const config = require("./config.json");
const server = require("./helpers/server.js");
const pkg = require("./package.json");

const startServers = async () => {
	const servers = await Promise.all(config.bots.map(bot => new server(bot).initialize()));
	console.log(`NadekoConnector ${pkg.version}\n${pkg.description}`);
	console.log(`Listening on port${servers.map(s => s.port).length < 2 ? "" : "s"} ${servers.map(s => s.port).join(", ")}.`);
};

startServers();