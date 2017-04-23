// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Base = require("./base.js");

function ConsoleBot(Bot) {
	process.stdin.resume();
	process.stdin.setEncoding("utf8");
	process.stdin.on("data", function (text) {
		text = text.strip();
		if (text == "/exit") process.exit();
		Bot.command({}, text);
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
