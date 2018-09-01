var express = require("express");
var helmet = require("helmet");
var morgan = require("morgan");

var isPortAvailable = require("is-port-available");
var jwt = require("jsonwebtoken");

var Connector = require("./connector.js");
var fileManager = require("./fileManager.js");


class server {
	constructor(settings) {
		if (!settings || typeof settings !== "object")
			throw new Error("Invalid settings specified.");

		let requiredSettingsModel = {
			port: "number",
			password: "string",
			databasePath: "string",
			credentialsPath: "string"
		};

		for (let [property, type] of Object.entries(requiredSettingsModel)) {
			if (typeof settings[property] !== type)
				throw new typeError(property, settings[property], type);
			this[property] = settings[property];
		}

		if (!Array.isArray(settings.disabledEndpoints))
			settings.disabledEndpoints = [];
		this.disabledEndpoints = settings.disabledEndpoints;

		if (typeof settings.readOnly !== "boolean")
			settings.readOnly = false;
		this.readOnly = settings.readOnly;
	}

	async initialize() {
		if (!(await isPortAvailable(this._port)))
			throw new Error("Port unavailable.");

		if (!(await fileManager.checkIfExists(this.credentialsPath)))
			throw new Error("Credentials does not exist.");
		if (!(await fileManager.checkReadable(this.credentialsPath)))
			throw new Error("Credentials is not readable.");

		if (!(await fileManager.checkIfExists(this.databasePath)))
			throw new Error("Database does not exist.");
		if (!(await fileManager.checkReadable(this.databasePath)))
			throw new Error("Database is not readable.");

		if (!(await fileManager.checkWritable(this.databasePath)))
			this.readOnly = true;

		this.connector = new Connector(this.databasePath, this.credentialsPath, this.disabledEndpoints, this.readOnly);
		await this.connector.initialize();

		this.app = express();
		this.app.use(helmet());
		this.app.use(morgan("dev"));

		this.connector.endpoints.map(async endpoint => await this.registerEndpoint(endpoint));

		this.app.listen(this._port);
	}

	get port() {
		return this._port;
	}

	set port(port) {
		this._port = port;
	}

	async registerEndpoint(endpoint) {
		if (!this.connector)
			throw new Error("Server not initialized.");
		if (typeof endpoint !== "string")
			throw new Error("Invalid endpoint specified.");
		let context = this;
		this.app.get(`/${endpoint.toLowerCase()}/:token`, async function (request, response) {
			let result = {};
			try {
				let query = await context.parseToken(request.params.token);
				let properties = await context.checkProperties(query, endpoint);
				result = await context.handleEndpoint(endpoint, query, properties);
			}
			catch (error) {
				result = { error: error.name, message: error.message };
			}
			finally {
				response.json(result);
			}
		});
	}

	async parseToken(token) {
		let query = await jwt.verify(token, this.password);
		if (!query || typeof query !== "object")
			throw new Error("Invalid token.");
		return query;
	}

	async checkProperties(query, endpoint) {
		let keys = Object.keys(query).sort();
		let requiredProperties = await this.getRequiredProperties(endpoint);
		Object.keys(requiredProperties).map(property => {
			if (!(keys.includes(property) && typeof query[property] === requiredProperties[property].type))
				throw new Error(`Invalid properties specified. \n${requiredProperties[property].error}`);
		});
		return Object.keys(requiredProperties);
	}

	async getRequiredProperties(endpoint) {
		switch (endpoint) {
			case "getBotInfo":
			case "getTables":
				return {};
			case "getFields":
				return {
					table: {
						type: "string",
						error: "table must be a name of a table present in the database. Use getTables() to get a list of tables."
					}
				};
			case "execSql":
				return {
					command: {
						type: "string",
						error: "command must be a valid SQL command string that can be executed on the database."
					}
				};
			case "getClubInfo":
				return {
					name: {
						type: "string",
						error: "name must be the name of the club in name#discrim format as a string."
					}
				};
			case "getClubMembers":
				return {
					name: {
						type: "string",
						error: "name must be the name of the club in name#discrim format as a string."
					},
					startPosition: {
						type: "number",
						error: "startPosition must be a positive non-zero integer value."
					},
					items: {
						type: "number",
						error: "items must be a positive non-zero integer value."
					}
				};
			case "getCurrency":
			case "getGlobalRank":
			case "getGlobalXp":
			case "getClubInfoByUser":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					}
				};
			case "setCurrency":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					currency: {
						type: "number",
						error: "currency must be a negative or positive integer value."
					}
				};
			case "createTransaction":
			case "addCurrency":
			case "subtractCurrency":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					currency: {
						type: "number",
						error: "currency must be a negative or positive integer value."
					},
					reason: {
						type: "string",
						error: "reason for the transaction must be a non empty string."
					}
				};
			case "getGuildXp":
			case "getGuildRank":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					guildId: {
						type: "string",
						error: "guildId must be specified as a string to avoid precision loss."
					}
				};
			case "setGuildXp":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					guildId: {
						type: "string",
						error: "guildId must be specified as a string to avoid precision loss."
					},
					xp: {
						type: "number",
						error: "xp must be a positive or negative integer value."
					},
					awardedXp: {
						type: "number",
						error: "awardedXp must be a positive or negative integer value."
					}
				};
			case "addGuildXp":
			case "subtractGuildXp":
			case "awardGuildXp":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					guildId: {
						type: "string",
						error: "guildId must be specified as a string to avoid precision loss."
					},
					xp: {
						type: "number",
						error: "xp must be a positive or negative integer value."
					}
				};
			case "getGuildXpLeaderboard":
			case "getGuildXpRoleRewards":
			case "getGuildXpCurrencyRewards":
				return {
					guildId: {
						type: "string",
						error: "guildId must be specified as a string to avoid precision loss."
					},
					startPosition: {
						type: "number",
						error: "startPosition must be a positive non-zero integer value."
					},
					items: {
						type: "number",
						error: "items must be a positive non-zero integer value."
					}
				};
			case "getTransactions":
				return {
					userId: {
						type: "string",
						error: "userId must be specified as a string to avoid precision loss."
					},
					startPosition: {
						type: "number",
						error: "startPosition must be a positive non-zero integer value."
					},
					items: {
						type: "number",
						error: "items must be a positive non-zero integer value."
					}
				};
			case "getGlobalXpLeaderboard":
			case "getClubLeaderboard":
				return {
					startPosition: {
						type: "number",
						error: "startPosition must be a positive non-zero integer value."
					},
					items: {
						type: "number",
						error: "items must be a positive non-zero integer value."
					}
				};
			default:
				throw new Error("Invalid endpoint specified.");
		}
	}

	async handleEndpoint(endpoint, query, properties) {
		let args = [];
		properties.map(property => args.push(query[property]));
		return await this.connector[endpoint](...args);
	}
}

module.exports = server;