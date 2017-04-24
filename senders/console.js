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
		Bot.command({}, text);
		rl.prompt();
	});
}

ConsoleBot.prototype.print = function(dest, msg) {
	var output = Base.formatter(this, msg);
	console.log(output);
};

ConsoleBot.prototype.warn = function(dest, msg) {
	var output = Base.formatter(this, msg);
	console.warn(output);
};

ConsoleBot.prototype.error = function(dest, msg) {
	var output = Base.formatter(this, msg);
	console.error(output);
};

ConsoleBot.prototype.format = function(fmt, msg) {
	return msg;
};

module.exports = ConsoleBot;
