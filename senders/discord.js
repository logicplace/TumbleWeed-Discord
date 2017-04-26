// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Discord = require("discord.js");

const Base = require("./base.js");

function roleName(role) {
	return role.name;
}

function DiscordBot(Bot) {
	this.bot = Bot;

	var memory = this.discord = Bot.loadMemory("discord", {
		"guilds": {},
	});

	// Register commands
	var registrar = Bot.registrar(this);
	registrar.command("nick _", this.nick);
	registrar.command("avatar", this.avatar);
	registrar.command("avatar _", this.avatar);
	registrar.command("prefix _", this.prefix);

	registrar.command("locale _", this.resetLocale);
	registrar.command("locales", this.listLocales);
	registrar.command("local _ ^_", this.setMessage);

	// Make discord client
	var client = this.client =  new Discord.Client();

	client.on("ready", () => {
		console.log("Connected to discord.");

		// Check to see if custom roles exist
		for (var guild of client.guilds) {
			if (!(guild.id in memory.guilds)) {
				var guildmem = memory.guilds[guild.id] = {
					"prefix": Bot.prefix,
					"adminRole": null,
					"contentRole": null,
					"localization": {}
				};
				// Add new roles. The names etc can be changed.
				guild.createRole({"name": "TumbleWeed Admin"})
				.then(role => { guildmem.adminRole = role.id });
				guild.createRole({"name": "TumbleWeed Content Provider"})
				.then(role => { guildmem.contentRole = role.id });	
			}
		}
	});

	client.on("message", message => {
		var context = {
			"guild": message.guild.id,
			"channel": message.channel.id,
		};

		var mg = memory.guilds[context.guild];
		var ev = this.makeEvent(context, mg);
		ev.reply = {
			"print": this.print.bind(this, context),
			"warn": this.warn.bind(this, context),
			"error": this.error.bind(this, context),
		};
		
		ev.authority = {
			"admin": mg.adminRole in message.member.roles,
			"content": mg.contentRole in message.member.roles,
		};

		Bot.command(ev, message.content)
	});

	Discord.login(Bot.settings.discord.token);
}

DiscordBot.prototype.makeEvent = function(context, mg) {
	mg = mg || this.discord.guilds[context.guild];
	return {
		"prefix": mg.prefix,
		"localization": mg.localization,
		"context": context
	}
}

DiscordBot.prototype.formatter = Base.formatter;

DiscordBot.prototype.print = function(dest, msg, args) {
	var output = this.formatter(this.makeEvent(dest), msg, args);
	this.client.guilds[dest.guild].channels[dest.channel].send(output);
}

DiscordBot.prototype.warn = function(dest, msg, args) {
	this.print(dest, Base.prependString("Warning: ", msg), args)
};

DiscordBot.prototype.error = function(dest, msg, args) {
	this.print(dest, Base.prependString("Error: ", msg), args)
};

DiscordBot.prototype.format = function(fmt, msg) {
	switch (fmt) {
		case "code": return "``" + msg + "``";
		case "no-preview": return "<" + msg + ">";
		default: return msg;
	}
};

DiscordBot.prototype.nick = function(ev, nick) {
	if (!ev.authority.admin) {
		ev.reply.error("discord.cmd.nick.no-permission");
		return;
	}

	this.client.user.setNickname(nick);
}

DiscordBot.prototype.avatar = function(ev, avatar) {
	if (!ev.authority.admin) {
		ev.reply.error("discord.cmd.avatar.no-permission");
		return;
	}
	// TODO: change avatar by url and embed
}

DiscordBot.prototype.prefix = function(ev, prefix) {
	if (!ev.authority.admin) {
		ev.reply.error("discord.cmd.prefix.no-permission");
		return;
	}

	this.discord[ev.context.guild].prefix = prefix;
	ev.reply.error("discord.cmd.prefix.success");
}

DiscordBot.prototype.resetLocale = function(ev, locale) {
	if (!ev.authority.admin) {
		ev.reply.error("discord.cmd.locale.no-permission");
		return;
	}

	if (!locale.match(/^[a-z]+[A-Z]+$/)) {
		ev.reply.error("discord.cmd.locale.bad-file");
		return;
	}

	try {
		var attempt = require("./" + locale + ".json");
	} catch(e) {
		ev.reply.error("discord.cmd.locale.no-file");
		return;
	}
	
	for (var k in attempt) {
		ev.localization[k] = attempt[k];
	}
	ev.reply.print("discord.cmd.locale.success");
}

DiscordBot.prototype.listLocales = function(ev) {
	ev.reply.print([
		"string", "discord.cmd.locales.pfx",
		"string", "enUS",
	]);
}

DiscordBot.prototype.setMessage = function(ev, id, msg) {
	if (!ev.authority.admin) {
		ev.reply.error("discord.cmd.local.no-permission");
		return;
	} 

	if (!(id in ev.bot.localization)) {
		ev.reply.error("discord.cmd.local.no-id");
		return;
	}

	ev.localization[id] = msg;
	ev.reply.print("discord.cmd.local.success");
}

module.exports = DiscordBot;
