// TumbleWeed Discord Tumblr (and Twitter!) bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Twit = require("twit");

function TwitterListener(Bot) {
	// Login to twitter
	Bot.settings.twitter.oauth.app_only_auth = true;
	this.conn = new Twit(Bot.settings.twitter.oauth);

	// Register commands
	var registrar = Bot.registrar(this);
	registrar.command("twitter follow #(.+)#", this.follow);
	registrar.command("twitter follow_original #(.+)#", this.followOriginal);
	registrar.command("follow #<?https?://twitter\\.com/search([?&]\\w+=[^&]+)*[?&]q=([^&]+)\\S*>?$#", this.followURL);
	registrar.command("follow_original #<?https?://twitter\\.com/search([?&]\\w+=[^&]+)*[?&]q=([^&]+)\\S*>?$#", this.followOriginalURL);
	registrar.command("twitter unfollow *", this.unfollow);
	registrar.command("twitter list", this.list);

	// Help hooks
	registrar.help("twitter", {
		"command": "twitter Command",
		"help": "twitter.help",
		"Command": [
			"follow", {
				"command": "twitter follow Search",
				"help": "twitter.help.cmd.follow",
			},
			"unfollow", {
				"command": "twitter unfollow Search#",
				"help": "twitter.help.cmd.unfollow",
			},
			"list", {
				"command": "twitter list",
				"help": "twitter.help.cmd.list"
			}
		],
	});

	registrar.help("follow", {
		"command": "follow TwitterSearchURL",
	});

	this.memory = Bot.loadMemory("twitter", {
		// {context: [[query, latest status ID, extra search options], ...], ...}
		"queries": {}
	});

	// Update now and again every 10 minutes
	setInterval(this.runQueries.bind(this), 10 * 60 * 1000);
	this.onInit = this.runQueries.bind(this);
}

TwitterListener.prototype.follow = function (event, query, original) {
	if (!event.authority.content) {
		event.reply.error("twitter.cmd.follow.no-permission");
		return;
	}

	var query = [
		query,
		0,
		{}
	];

	if (original) query[2].original = true;

	if (event.context in this.memory.queries) {
		this.memory.queries[event.context].push(query);
	} else {
		this.memory.queries[event.context] = [query];
	}
	
	event.reply.print("twitter.cmd.follow.success");
}

TwitterListener.prototype.followURL = function (event, query, original) {
	this.follow(event, decodeURIComponent(query[2]));
}

TwitterListener.prototype.followOriginal = function (event, query) {
	this.follow(event, query, true);
}

TwitterListener.prototype.followOriginalURL = function (event, query) {
	this.followURL(event, crap, query, true);
}

TwitterListener.prototype.unfollow = function (event, indexes) {
	if (!event.authority.content) {
		event.reply.error("twitter.cmd.unfollow.no-permission");
		return;
	}

	var queries = this.memory.queries[event.context], removed = 0;

	// Sort these in reverse order so the splice indices won't change.
	indexes.sort((a, b) => { return b-a; });
	for (let idx of indexes) {
		// Remove any # prefixes.
		if (idx[0] == "#") idx = idx.substr(1);
		idx = parseInt(idx) - 1;

		if (idx > queries.length) continue;
		queries.splice(idx, 1);
		++removed;
	}

	if (removed) {
		event.reply.print("twitter.cmd.unfollow.success", {"count": removed});
		if (queries.length == 0) {
			delete this.memory.queries[event.context];
			event.reply.print("twitter.cmd.unfollow.empty");
		}
	}
	else event.reply.print("twitter.cmd.unfollow.none");
}

TwitterListener.prototype.list = function (event) {
	var idx = 1, msg = "";
	for (let query of this.memory.queries[event.context]) {
		msg += "\n* #" + idx.toString() + ": " + query[0];
		++idx;
	}

	if (idx == 1) event.reply.print("twitter.cmd.list.none");
	else event.reply.print([
		"string", "twitter.cmd.list.header",
		"string", msg
	]);
}

TwitterListener.prototype.runQueries = function () {
	var queries = this.memory.queries;
	for (let context in queries) {
		for (let query of queries[context]) {
			var opts = {
				"q": query[0],
				"result_type": "recent",
				"include_entities": "false",
			};

			if (query[1]) opts.since_id = query[1].toString();
			else opts.count = 1;

			this.conn.get("search/tweets", opts, sendUpdates.bind(this, context, query));
		}
	}
}

function sendUpdates(context, query, err, data, response) {
	var opts = query[2];
	if (err) {
		this.bot.sender.error(context, err);
		return;
	}

	// Store the latest ID:
	if (data.statuses.length) {
		query[1] = data.statuses[0].id;
	} else return;

	for (var i = data.statuses.length - 1; i >= 0; --i) {
		var status = data.statuses[i];

		// Extra filters
		if (opts.original && status.in_reply_to_user_id) continue;

		// Dispatch status
		this.bot.sender.print(context, "https://twitter.com/" + status.user.screen_name + "/status/" + status.id_str);
	}
}

module.exports = TwitterListener;
