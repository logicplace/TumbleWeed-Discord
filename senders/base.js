// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

module.exports = {
	"formatter": function (self, msg) {
		if (typeof(msg) == "string") return self.format("string", msg);

		var out = "";
		for (var i = 0; i < msg.length; i += 2) {
			var fmt = msg[i], value = msg[i+1];
			out += self.format(fmt, value);
		}
		return out;
	},
}
