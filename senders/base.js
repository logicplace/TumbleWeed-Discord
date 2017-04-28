// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

function replace(ev, msg, args) {
	args = args || {};
	return msg.replace(/\{(\w+)\}/g, function (m, word) {
		if (word == "prefix") return ev.prefix;
		else if (word in args) return args[word];
		else return m;
	});
}

function localize(ev, msg, args) {
	l1 = ev.localization || {};
	var l2 = this.bot.localization || {};

	if (msg in l1) msg = l1[msg];
	else if (msg in l2) msg = l2[msg];

	if (typeof(msg) == "string") {
		return this.format("string", replace(ev, msg, args));
	}
	
	var out = "";
	for (var i = 0; i < msg.length; i += 2) {
		var fmt = msg[i], value = localize.call(this, ev, msg[i+1], args);
		out += this.format(fmt, replace(ev, value, args));
	}
	return out;
}

module.exports = {
	"formatter": localize,

	"prependString": function (str, msg) {
		str = ["string", str];
		if (typeof(msg) == "string") msg = ["string", msg];
		return ["string", str].concat(msg);
	},
}
