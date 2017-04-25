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

	// load receivers
	this.receivers = [];
	for(var r of fs.readdirSync("./receivers")) {
		this.receivers.push(new (require("./receivers/" + r))(this));
	}

	setInterval(this.saveMemory.bind(this), 60 * 60 * 1000);

	this.sender = new (require("./senders/" + Settings.sender + ".js"))(this);
}

TumbleWeed.prototype.registrar = function(listener) {
	return {
		"command": this.registerCommand.bind(this, listener),
		"help": this.registerHelp.bind(this)
	}
}

TumbleWeed.prototype.registerCommand = function(listener, form, handler) {
	this.commands.push(new Command(this, listener, form, handler));
};

TumbleWeed.prototype.registerHelp = function(command, help) {
	var helpObj;
	if (command in this.help) {
		helpObj = this.help[command];
	} else {
		helpObj = this.help[command] = [];
	}

	// TODO: normalize
	helpObj.push(help);
}

TumbleWeed.prototype.command = function(event, input) {
	if (input.substr(0, this.prefix.length) == this.prefix) {
		input = input.substr(this.prefix.length);
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
		this.sender.error(event.channel, [
			"string", "Error in argument " + (best + 1) + ". See ",
			"code", this.prefix + "help " + bestCommand.helpStr,
			"string", " for details.",
		]);
	} else {
		this.sender.error(event.channel, [
			"string", "Invalid command. See ",
			"code", this.prefix + "help",
			"string", " for details."
		]);
	}
	return false;
};

TumbleWeed.prototype.loadMemory = function(mod, empty) {
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

TumbleWeed.prototype.saveMemory = function(mod, sync) {
	var sync = sync || false;
	if (mod == "sync") {
		sync = true;
		mod = undefined;
	}

	if (mod) {
		(sync ? fs.writeFileSync : fs.writeFile)("./memory/" + mod + ".json", JSON.stringify(this.memory[mod]), (err) => {
			if (err) {
				console.error("Error writing memory for", mod, err);
			}
		});
	} else {
		for (var mod in self.memory) {
			self.saveMemory(mod, sync);
		}
	}
}


function Command(bot, listener, form, handler) {
	this.bot = bot;
	this.listener = listener;

	var splits = form.split(" "), first = true;
	this.args = [];
	this.helpStr = "";
	for (var i = 0; i < splits.length; ++i) {
		var split = splits[i], container = this.args;
		if (split.charAt(0) == "^") {
			// Quotable argument
			container = [4];
			this.args.push(container);
			split = split.substr(1);
		}

		if (split.charAt(0) == "#") {
			var result = "";
			for (; splits[i].charAt(splits[i].length - 1) != "#"; ++i) {
				result += " " + splits[i];
			}
			result += " " + splits[i];
			container.push([0, new RegExp("^" + result.substring(2, result.length - 1))])
			first = false;
		}
		else if (split == "_") {
			container.push([1]);
			first = false;
		}
		else if (split == "*") {
			container.push([2]);
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
var singleWord = /^\S+/;
var quotable = /^"((""|[^"]+)*)"/;
Command.prototype.match = function(command, ev) {
	// Returns argument # this failed on or true for success.

	var params = [];
	for (var i = 0; i < this.args.length; i++) {
		// Hella ugly
		var arg = this.args[i];
		if (arg[0] == 4) {
			// Quotable argument case
			if (arg[1][0] == 2) {
				var tmp, words = [];
				while ((tmp = command.match(quotable))) {
					command = command.substr(tmp.length).replace(initialSpace, "");
					words.push(tmp[1]);
				}
				params.push(words);
				break;
			} else {
				var tmp = command.match(quotable);
				if (tmp) {
					command = tmp[1] + command.substr(tmp.length);
					arg = arg[1];
				}
			}
		}

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
process.on('exit', (code) => {
	TW.saveMemory("sync");
});
