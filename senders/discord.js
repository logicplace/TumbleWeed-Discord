// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Discord = require("discord.js");

const Base = require("./base.js");

function roleName(role) {
	return role.name;
}

function DiscordBot(Bot) {
	var memory = this.discord = Bot.loadMemory("discord", {
		"guilds": {},
	});

	// Register commands
	var registrar = Bot.registrar(this);
	registrar.command("nick _", this.nick);
	registrar.command("prefix _", this.prefix);

	registrar.command("locale _", this.resetLocale);
	registrar.command("locales", this.listLocales);
	registrar.command("local _ ^_", this.setMessage);

	// Help hooks
	registrar.help("nick", {
		"command": "nick NickName",
		"help": "discord.help.cmd.nick",
	});

	registrar.help("prefix", {
		"command": "prefix Prefix",
		"help": "discord.help.cmd.prefix",
	});

	registrar.help("locale", {
		"command": "locale LocaleName",
		"help": "discord.help.cmd.locale",
	});

	registrar.help("locale", {
		"command": "locales",
		"help": "discord.help.cmd.locales",
	});

	registrar.help("local", {
		"command": 'local MessageID "Message"',
		"help": "discord.help.cmd.local",
	});

	// Make discord client
	var client = this.client =  new Discord.Client();

	client.on("ready", () => {
		console.log("Connected to discord.");

		// Check to see if custom roles exist
		for (let guild of client.guilds) {
			guild = guild[1];
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

		Bot.onInit();
	});

	client.on("message", message => {
		// Ignore bots
		if (message.author.bot) return;

		// Construct message event
		var context = message.guild.id + ":" + message.channel.id;

		var mg = memory.guilds[context.guild];
		var ev = this.makeEvent(context, mg);
		ev.message = message;

		ev.reply = {
			"print": this.print.bind(this, context),
			"warn": this.warn.bind(this, context),
			"error": this.error.bind(this, context),
		};
		
		var admin = message.member.roles.has(mg.adminRole);

		ev.authority = {
			"admin": admin,
			"content": admin || message.member.roles.has(mg.contentRole),
		};

		// Dispatch
		Bot.command(ev, message.content)
	});

	client.login(Bot.settings.discord.token);
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
	dest = dest.split(":");

	var output = this.formatter(this.makeEvent(dest), msg, args);
	this.client.guilds.get(dest[0]).channels.get(dest[1]).sendMessage(output);
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

	ev.message.guild.members.get(this.client.user.id).setNickname(nick);
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
