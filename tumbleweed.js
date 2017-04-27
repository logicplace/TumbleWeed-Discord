"use strict";

// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const fs = require("fs");
const escapeRegExp = require("escape-string-regexp");

const Settings = require("./settings.json");

function TumbleWeed() {
	this.settings = Settings;
	this.prefix = Settings.prefix;
	this.help = {}
	this.commands = [];
	this.memory = {};
	this.localization = require("./enUS.json");

	// load receivers
	this.receivers = [];
	for(var r of fs.readdirSync("./receivers")) {
		var receiver = new (require("./receivers/" + r))(this);
		receiver.bot = this;
		this.receivers.push(receiver);
	}

	setInterval(this.saveMemory.bind(this), 60 * 60 * 1000);

	this.sender = new (require("./senders/" + Settings.sender + ".js"))(this);
	this.sender.bot = this;
}

TumbleWeed.prototype.onInit = function () {
	for (let receiver of this.receivers) {
		receiver.onInit && receiver.onInit();
	}
}

TumbleWeed.prototype.registrar = function (listener) {
	return {
		"command": this.registerCommand.bind(this, listener),
		"help": this.registerHelp.bind(this)
	}
}

TumbleWeed.prototype.registerCommand = function (listener, form, handler) {
	this.commands.push(new Command(this, listener, form, handler));
};

TumbleWeed.prototype.registerHelp = function (command, help) {
	var helpObj;
	if (command in this.help) {
		helpObj = this.help[command];
	} else {
		helpObj = this.help[command] = [];
	}

	// TODO: normalize
	helpObj.push(help);
}

TumbleWeed.prototype.command = function (event, input) {
	var prefix = event.prefix || this.prefix;
	if (input.substr(0, prefix.length) == prefix) {
		input = input.substr(prefix.length);
	}
	else {
		return false;
	}

	event.bot = this;

	var bestCommand = null, best = 0;
	for (var command of this.commands) {
		var res = command.match(input, event);
		if (res === true) return true;
		else if (res > best) {
			best = res;
			bestCommand = command;
		}
	}

	// If we got here, no command matched, output error based on best.
	if (best) {
		this.sender.error(event.context, [
			"string", "Error in argument " + best + ". See ",
			"code", prefix + "help " + bestCommand.helpStr,
			"string", " for details.",
		]);
	} else {
		this.sender.error(event.context, [
			"string", "Invalid command. See ",
			"code", prefix + "help",
			"string", " for details."
		]);
	}
	return false;
};

TumbleWeed.prototype.loadMemory = function (mod, empty) {
	var data;
	try {
		data = require("./memory/" + mod + ".json");
	} catch (e) {
		data = empty;
		this.memory[mod] = data;
		this.saveMemory(mod);
	}
	this.memory[mod] = data;
	return data;
}

TumbleWeed.prototype.saveMemory = function (mod, sync) {
	var sync = sync || false;
	if (mod == "sync") {
		sync = true;
		mod = undefined;
	}

	if (mod) {
		var write = (sync ? fs.writeFileSync : fs.writeFile).bind(fs, "./memory/" + mod + ".json", JSON.stringify(this.memory[mod]));
		if (sync) write();
		else write((err) => {
			if (err) {
				console.error("Error writing memory for", mod, err);
			}
		});
	} else {
		for (var mod in this.memory) {
			this.saveMemory(mod, sync);
		}
		console.log((new Date()).toString() + ": Saved memory.");
	}
}


function Command(bot, listener, form, handler) {
	this.bot = bot;
	this.listener = listener;

	var splits = form.split(" "), first = true;
	this.args = [];
	this.helpStr = "";
	
	var bareCases = {
		"_":  1, "*":  2,
		"^_": 4, "^*": 5,
	};

	for (var i = 0; i < splits.length; ++i) {
		var split = splits[i], container = this.args;
		if (split.charAt(0) == "#") {
			var result = "";
			for (; splits[i].charAt(splits[i].length - 1) != "#"; ++i) {
				result += " " + splits[i];
			}
			result += " " + splits[i];
			container.push([0, new RegExp("^" + result.substring(2, result.length - 1))])
			first = false;
		}
		else if (split in bareCases) {
			container.push([bareCases[split]]);
			first = false;
		}
		else {
			if (first) this.helpStr += " " + split;
			container.push([3, new RegExp("^" + escapeRegExp(split), "i")]);
		}
	}

	this.helpStr = this.helpStr.substr(1);

	this.handler = handler;
}

var initialSpace = /^\s+/;
var singleWord = /^(\S+)/;
var quotable = /^"((""|[^"]+)*)"/;
Command.prototype.match = function (command, ev) {
	// Returns argument # this failed on or true for success.

	var params = [];
	for (var i = 0; i < this.args.length; i++) {
		var arg = this.args[i];
		switch (arg[0]) {
		case 0:
			// Given RegExp case.
			var tmp = command.match(arg[1]);
			if (!tmp) return i;
			params.push(tmp);
			command = command.substr(tmp[0].length);
			break;
		case 1:
			// Single word case
			var tmp = command.match(singleWord);
			if (!tmp) return i;
			params.push(tmp[0]);
			command = command.substr(tmp[0].length);
			break;
		case 2:
			// Remaining words case
			var words = command.split(/ +/);
			// There's a chance of returning [ '' ] which we need to avoid.
			params.push(words.length > 1 || words.length && words[0] ? words : []);
			command = "";
			break;
		case 3:
			// Literal word case
			var tmp = command.match(arg[1]);
			if (!tmp) return i;
			command = command.substr(tmp[0].length);
			break;
		case 4: case 5:
			// Quotable words cases
			var tmp, case4 = arg[0] == 4, quotes = [];
			while ((tmp = command.match(quotable)) || (tmp = command.match(singleWord))) {
				command = command.substr(tmp[0].length);
				quotes.push(tmp[1]);
				if (case4) break;
				command = command.replace(initialSpace, "");
			}
			if (case4) {
				if (params.length != 1) return i;
				params.push(quotes[0]);
			} else {
				params.push(quotes.length > 1 || quotes.length && quotes[0] ? quotes : []);
			}
		}

		if (command) {
			var spaces = command.match(initialSpace);
			if (!spaces) return i; // Argument wasn't fully absorbed.
			command = command.substr(spaces[0].length);
		}
	}

	// If we got here, this command matched. Pass all the params.
	this.handler.apply(this.listener, [ev].concat(params));
	return true;
};


// Main
var TW = new TumbleWeed();

// http://stackoverflow.com/a/14032965/734170
function exitHandler(options, err) {
	if (options.cleanup) TW.saveMemory("sync");
	if (err) console.log(err.stack);
	if (options.exit) process.exit();
}

//do something when app is closing
process.on("exit", exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, {exit:true}));
