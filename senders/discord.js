// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Discord = require("discord.js");

const Base = require("./base.js");

function DiscordBot(Bot) {
	this.bot = Bot;
}

DiscordBot.prototype.error = function(dest, msg) {
	var output = Base.formatter(this, msg);
	// TODO: output
};

DiscordBot.prototype.format = function(fmt, msg) {
	switch (fmt) {
		case "code": return "``" + msg + "``";
		case "no-preview": return "<" + msg + ">";
		default: return msg;
	}
};

module.exports = DiscordBot;
