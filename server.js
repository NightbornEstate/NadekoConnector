var utils = require("./utils.js");
var express = require("express");
var app = express();
var config = utils.readJson("./config.json");
var package = utils.readJson("./package.json");
var log = require("fancy-log");
var helmet = require("helmet");

app.use(helmet());
app.enable("trust proxy");
app.use(function (req, res, next) {
	try {
		res.append("content-type", "application/json; charset = utf-8");
		var token = req.url.split("/")[2];
		var parsedToken = utils.parseToken(config, token);
		if (!parsedToken.success)
			log(`${req.ip.split(":")[3]} ${req.method} ${req.url.split("/")[1]} ${token}`);
		if (parsedToken.success) {
			delete parsedToken["iat"];
			delete parsedToken["success"];
			log(`${req.ip.split(":")[3]} ${req.method} ${req.url.split("/")[1]} ${utils.stringify(parsedToken)}`);
		}
	} catch (error) {
		log(`Error: ${error.message}`);
	}
	next();
});

var activeEndpoints = utils.getActiveEndpoints(config).activeEndpoints;

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