var config = require("../config.json");
var connector = require("./connector.js");
var jwt = require("jsonwebtoken");
var os = require("os");
var fs = require("fs");

var handleEndpoint = async function (token, endpoint) {
	let obj = parseToken(token);
	if (!obj.success)
		return failure(obj);
	let data = checkProperties(obj, endpoint);
	if (!data.success)
		return failure(data);
	let info = await connector[endpoint](data);
	if (!info.success)
		return failure(info);
	return success(info);
};

var calcLevel = (xp) => {
	try {
		let lvl = 0,
			gap = 0;
		for (var i in [...Array(1000).keys()]) {
			gap = 36 + (9 * i);
			if (xp >= gap) {
				xp -= gap;
				lvl++;
			}
			if (xp < gap)
				break;
		}
		return success({
			level: lvl,
			currentLevelXp: xp,
			nextLevelXp: gap
		});
	}
	catch (error) {
		return failure({ error: error.message });
	}
};

var success = function (data, stringify) {
	if (!data)
		data = {};
	data["success"] = true;
	if (stringify)
		return JSON.stringify(data, null, 4);
	return data;
};

var failure = function (data, stringify) {
	if (!data)
		data = {};
	if (!data["error"])
		data["error"] = "An error occured.";
	data["success"] = false;
	if (stringify)
		return JSON.stringify(data, null, 4);
	return data;
};

// for future usage
var updateConfig = function (property, value) {
	let newConfig = config;
	newConfig[property] = value;
	try {
		fs.writeFileSync("../config.json", JSON.stringify(newConfig, null, 4), "utf8");
		return success();
	} catch (error) {
		return failure({ error: error.message });
	}
};

var getIpAddress = function () {
	try {
		let ifaces = os.networkInterfaces();
		let ipAddress;
		Object.keys(ifaces).forEach(function (ifname) {
			ifaces[ifname].forEach(function (iface) {
				if ("IPv4" !== iface.family || iface.internal !== false) {
					return;
				}
				if (iface.address !== null && iface.address !== undefined)
					ipAddress = iface.address;
			});
		});
		return success({ ipAddress: ipAddress });
	}
	catch (error) {
		return failure({ error: error.message });
	}
};

var getActiveEndpoints = function () {
	try {
		let activeEndpoints = [];
		let endpoints = Object.keys(config.endpoints);
		endpoints.forEach((endpoint) => {
			if (config.endpoints[endpoint])
				activeEndpoints.push(endpoint);
		});
		return success({ activeEndpoints: activeEndpoints });
	}
	catch (error) {
		return failure({ error: error.message });
	}
};

var parseToken = function (token, endpoint) {
	var obj;
	try {
		obj = jwt.verify(token, config.password);
	}
	catch (error) {
		return failure({ error: error.message });
	}
	return success(obj);
};

var checkProperties = function (obj, endpoint) {
	try {
		let keys = Object.keys(obj).sort();
		let requiredKeys = getRequiredKeys(endpoint).keys;
		if (requiredKeys.every(val => keys.includes(val))) {
			return success(obj);
		}
	} catch (error) {
		return failure({ error: "Invalid properties specified." });
	}
};

var getRequiredKeys = function (endpoint) {
	// let allEndpoints = [
	// 	"getBotInfo",
	// 	"getTables",
	// 	"getFields",
	// 	"getBalance",
	// 	"setBalance",
	// 	"createTransaction",
	// 	"getTransactions",
	// 	"getGuildXp",
	// 	"setGuildXp",
	// 	"getGuildXpLeaderboard",
	// 	"getGlobalXpLeaderboard",
	// 	"getGuildXpRoleRewards",
	// 	"getGuildXpCurrencyRewards"];
	switch (endpoint) {
		case "getBotInfo":
		case "getTables":
		case "getGlobalXpLeaderboard":
			return success({
				keys: []
			});
		case "getBalance":
			return success({
				keys: ["userId"]
			});
		case "setBalance":
			return success({
				keys: ["userId", "balance"]
			});
		case "createTransaction":
			return success({
				keys: ["userId", "amount", "reason"]
			});
		case "getGuildXp":
			return success({
				keys: ["userId", "guildId"]
			});
		case "setGuildXp":
			return success({
				keys: ["userId", "guildId", "xp", "awardedXp"]
			});
		case "getGuildXpLeaderboard":
			return success({
				keys: ["guildId", "startPosition", "items"]
			});
		case "getTransactions":
			return success({
				keys: ["userId", "startPosition", "items"]
			});
		case "getGuildXpRoleRewards":
		case "getGuildXpCurrencyRewards":
			return success({
				keys: ["guildId"]
			});
		case "getFields":
			return success({
				keys: ["tableName"]
			});
		default:
			return failure();
	}
};

exports.success = success;
exports.failure = failure;
exports.calcLevel = calcLevel;
exports.updateConfig = updateConfig; // for future usage
exports.getIpAddress = getIpAddress;
exports.getActiveEndpoints = getActiveEndpoints;
exports.parseToken = parseToken;
exports.checkProperties = checkProperties;
exports.handleEndpoint = handleEndpoint;