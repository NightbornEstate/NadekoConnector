var express = require("express");
var app = express();
var utils = require("./helpers/utils.js");
var config = require("./config.json");
var package = require("./package.json");
var log = require("fancy-log");
var helmet = require("helmet");

app.use(helmet());
app.enable("trust proxy");
app.use(function (req, res, next) {
	try {
		res.append("content-type", "application/json; charset = utf-8");
		let token = utils.parseToken(req.url.split("/")[2]);
		if (!token.success)
			log(`${req.ip.split(":")[3]} ${req.method} ${req.url.split("/")[1]} ${req.url.split("/")[2]}`);
		if (token.success) {
			delete token["iat"];
			delete token["success"];
			log(`${req.ip.split(":")[3]} ${req.method} ${req.url.split("/")[1]} ${JSON.stringify(token)}`);
		}
	} catch (error) {
		log(`Error: ${error.message}`);
	}
	next();
});

let activeEndpoints = utils.getActiveEndpoints().activeEndpoints;

activeEndpoints.forEach((endpoint) => {
	if (config.endpoints[endpoint]) {
		app.get(`/${endpoint.toLowerCase()}/:token`, async function (req, res) {
			try {
				let result = await utils.handleEndpoint(req.params.token, endpoint);
				if (!result.success)
					throw new Error(result.error);
				res.end(utils.success(result, true));
			}
			catch (error) {
				log(`Error: ${error.message}`);
				res.end(utils.failure({ error: error.message }, true));
			}
		});
	}
});

app.listen(config.port, () => {
	console.log(`NadekoConnector ${package.version}`);
	console.log(`${package.description}`);
	console.log(`Active endpoints: ${activeEndpoints}`);
	console.log(`Listening at http://${utils.getIpAddress().ipAddress}:${config.port}/`);
});

process.on("unhandledRejection", error => {
	log(`Error: Unhandled Promise Rejection \n ${error.toString()}`);
});