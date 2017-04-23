// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Settings = require("./settings.json");
const escapeRegExp = require("escape-string-regexp");

function TumbleWeed() {
	this.settings = Settings;
	this.prefix = Settings.prefix;
	this.commands = [];

	// TODO: load receivers

	this.sender = require("./senders/" + Settings.sender + ".js")(this);
}

TumbleWeed.prototype.registerCommand = function(form, handler) {
	this.commands.push(new Command(form, handler));
};

TumbleWeed.prototype.command = function(event, input) {
	if (this.input.substr(0, this.prefix.length) == this.prefix) {
		input = input.substr(this.prefix.length);
	}
	else {
		return false;
	}

	var event.bot = this;

	var bestCommand = null, best = 0;
	for (var i = 0; i < this.commands.length; i++) {
		var command = this.commands[i];
		var res = command.match(input, event);
		if (res === true) return true;
		else if (res > best) {
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


function Command(bot, form, handler) {
	this.bot = bot;

	var splits = form.split(" "), first = true;
	this.args = [];
	for (var i = 0; i < splits.length; ++i) {
		var result = "", split = splits[i];
		if (split.charAt(0) == "#") {
			for (; splits[i].charAt(splits[i].length - 1) != "#"; ++i) {
				result += " " + splits[i];
			}
			this.args.push([0, new RegExp("^" + result.substring(2, result.length - 1))])
			first = false;
		}
		else if (split == "_") {
			this.args.push([1]);
			first = false;
		}
		else if (split == "*") {
			this.args.push([2]);
			first = false;
		}
		else {
			if (first) this.helpStr += " " + split;
			this.args.push([3, new RegExp("^" + escapeRegExp(split), "i")]);
		}
	}

	this.handler = handler;
}

var initialSpace = /^\s+/;
var singleWord = /^\S+/;
Command.prototype.match = function(command, ev) {
	// Returns argument # this failed on or true for success.

	var params = [];
	for (var i = 0; i < this.args.length; i++) {
		var arg = this.args[i];
		switch (arg[0]) {
		case 0:
			// Given RegExp case.
			var tmp = command.match(args[1]);
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
			params.push(command.split(/ +/));
			command = "";
			break;
		case 3:
			// Literal word case
			var tmp = command.match(args[1]);
			if (!tmp) return i;
			command = command.subtr(tmp[0].length);
			break;
		}

		var spaces = command.match(initialSpace);
		if (!spaces) return i; // Argument wasn't fully absorbed.
		command = command.substr(spaces[0].length);
	}

	// If we got here, this command matched. Pass all the params.
	this.handler.apply(ev, params);
	return true;
};
