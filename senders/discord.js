// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Discord = require("discord.js");
const Permissions = require("discord.js/src/util/Constants").PermissionFlags;

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

	var self = this;

	client.on("ready", () => {
		console.log("Connected to discord.");

		// Statup stuff with guilds
		var guildNames = [];
		for (let guild of client.guilds) {
			guild = guild[1];
			guildNames.push(guild.name + "(" + guild.id + ")");
			
			this.newGuild(guild);
		}
		console.log("I am in guilds:", guildNames.join(", "));

		Bot.onInit();
	});

	client.on("guildCreate", this.newGuild.bind(this));

	client.on("message", message => {
		// Ignore bots
		if (message.author.bot) return;

		// Construct message event
		var context = message.guild.id + ":" + message.channel.id;

		var mg = memory.guilds[message.guild.id];
		var ev = this.makeEvent(context, mg);
		ev.message = message;

		ev.reply = {
			"print": this.print.bind(this, context),
			"warn": this.warn.bind(this, context),
			"error": this.error.bind(this, context),
		};
		
		var admin = self.memberAuth(message.member, mg.adminRole, "admin");

		ev.authority = {
			"admin": admin,
			"content": admin || self.memberAuth(message.member, mg.contentRole, "content"),
		};

		// Dispatch
		Bot.command(ev, message.content)
	});

	client.login(Bot.settings.discord.token);
}

DiscordBot.prototype.newGuild = function (guild) {
	var memory = this.discord;
	var self = this;
	
	if (!(guild.id in memory.guilds)) {
		var guildmem = memory.guilds[guild.id] = {
			"prefix": this.bot.prefix,
			"adminRole": null,
			"contentRole": null,
			"localization": {}
		};

		// Check to see if roles exist (frankly if they do there was likely a problem.)
		var rolesFound = [false, false];
		for (let role of guild.roles) {
			role = role[1];
			if (role.name == "TumbleWeed Admin") {
				rolesFound[0] = true;
				guildmem.adminRole = role.id
			} else if (role.name == "TumbleWeed Content Provider") {
				rolesFound[1] = true;
				guildmem.contentRole = role.id
			}
		}
		// Add new roles. The names etc can be changed.
		function addedRole(attr, role) {
			guildmem[attr] = role.id;

			// Assign roles to users.
			self.assignRoles(guild, this.bot.settings.discord[attr.replace("Role", "")], role.id);
		}

		function couldNotAddRole(err) {
			console.log("Could not add roles to " + guild.name + ". Using members specified in settings exclusively. Error:", err);
		}

		if (!rolesFound[0]) {
			guild.createRole({"name": "TumbleWeed Admin"})
			.then(addedRole.bind(null, "adminRole"))
			.catch(couldNotAddRole);
		}
		if (!rolesFound[1]) {
			guild.createRole({"name": "TumbleWeed Content Provider"})
			.then(addedRole.bind(null, "contentRole"))
			.catch(couldNotAddRole);
		}
	} else {
		// Assign roles to users.
		self.assignRoles(guild, this.bot.settings.discord.admin, memory.guilds[guild.id].adminRole);
		self.assignRoles(guild, this.bot.settings.discord.content, memory.guilds[guild.id].contentRole);
	}
}

DiscordBot.prototype.makeEvent = function(context, mg) {
	var guild = context.split(":")[0];
	mg = mg || this.discord.guilds[guild] || {
		"prefix": this.bot.prefix,
		"localization": {},
	};

	return {
		"prefix": mg.prefix,
		"localization": mg.localization,
		"context": context
	}
}

DiscordBot.prototype.assignRoles = function (guild, users, roleID) {
	if (!users || !users.length) return;

	for (let member of guild.members) {
		member = member[1];
		if (users.indexOf(member.user.username) != -1 || users.indexOf(member.user.id) != -1) {
			member.addRole(roleID);
		}
	}
}

DiscordBot.prototype.memberAuth = function (member, role, level) {
	if (!member) return false;
	var setting = this.bot.settings.discord[level] || [], perm = false;
	if (role == false) {
		switch (level){
		case "admin":
			perm = member.hasPermission(Permissions.ADMINISTRATOR, false, false, true);
			break;
		case "content":
			perm = member.hasPermission([Permissions.MANAGE_MESSAGES, Permissions.EMBED_LINKS]);
			break;
		}
	}
	return member.roles.has(role) || perm || setting.indexOf(member.user.username) != -1 || setting.indexOf(member.user.id) != -1;
}

DiscordBot.prototype.formatter = Base.formatter;

DiscordBot.prototype.print = function(dest, msg, args) {
	var splits = dest.split(":");

	var output = this.formatter(this.makeEvent(dest), msg, args);
	this.client.guilds.get(splits[0]).channels.get(splits[1]).sendMessage(output);
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
