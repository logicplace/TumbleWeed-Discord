// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const readline = require('readline');

const Base = require("./base.js");

function ConsoleBot(Bot) {
	process.stdin.setEncoding("utf8");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: "Enter message: "
	});

	rl.prompt();

	rl.on("line", (text) => {
		text = text.trim();
		if (text == "/exit") process.exit();
		Bot.command(this.event, text);
		rl.prompt();
	});

	this.event = {
		"prefix": Bot.prefix,
		"context": "",
		"localization": {},
		"authority": {
			"admin": true,
			"content": true,
		},
		"reply": {
			"print": this.print.bind(this, {}),
			"warn": this.warn.bind(this, {}),
			"error": this.error.bind(this, {}),
		}
	}

	Bot.onInit();
}

ConsoleBot.prototype.formatter = Base.formatter;

ConsoleBot.prototype.print = function(dest, msg, args) {
	var output = this.formatter(this.event, msg, args);
	console.log(output);
};

ConsoleBot.prototype.warn = function(dest, msg, args) {
	var output = this.formatter(this.event, msg, args);
	console.warn(output);
};

ConsoleBot.prototype.error = function(dest, msg, args) {
	var output = this.formatter(this.event, msg, args);
	console.error(output);
};

ConsoleBot.prototype.format = function(fmt, msg) {
	return msg;
};

module.exports = ConsoleBot;
