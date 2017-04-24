// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Tumblr = require("tumblr");

function TumblrListener(Bot) {
	// Register commands
	var registrar = Bot.registrar(this);
	registrar.command("tumblr follow _ ^*", this.follow);
	registrar.command("follow #https?://(.*)\\.tumblr\\.com/?$# ^*", this.followURL1);
	registrar.command("follow #https?://(.*)\\.tumblr\\.com/tagged/(.*)$#", this.followURL2);

	registrar.command("tumblr unfollow _ ^*", this.unfollow);
	registrar.command("unfollow #https?://(.*)\\.tumblr\\.com/?# ^*", this.unfollowURL1);
	registrar.command("unfollow #https?://(.*)\\.tumblr\\.com/tagged/(.*)#", this.unfollowURL2);

	registrar.command("tumblr list *", this.list);

	// Help hooks
	registrar.help("tumblr", {
		"command": "tumblr Command",
		"help": "Manage Tumblr stuff.",
		"Command": [
			"follow", {
				"command": "tumblr follow BlogName [Tags]",
				"help": "Follow a blog, optionally limited to the given tags.",
			},
			"unfollow", {
				"command": "tumblr unfollow BlogName [Tags]",
				"help": "Unfollow a blog, optionally only the tags given.",
			}
		],
	});

	registrar.help("follow", {
		"command": "follow TumblrURL [Tags]",
	});

	this.bot = Bot;

	// Setup instance
	this.tumblr = Bot.loadMemory("tumblr") || {
		"blogs": {},
		"queries": [],
	};

	setInterval(this.runQueries.bind(this), 10 * 60 * 1000);
}

function parseTags(tags, channel) {
	var newTagSets = [];
	// Parse the tags.
	for (var i = 0; i < tags.length; ++i) {
		// Each "tag" is a group of tags separated by commas.
		// All tags must be represented in selected posts.
		// If a tag is prefixed with a !, it is negated.
		// Tags may have a # (following any !) but it's not required.
		var tagSplits = tags[i].split(","), tagSet = [channel, [], []];
		for (var j = 0; j < tagSplits.length; j++) {
			var tagSplit = tagSplits[j];
			var target = tagSet[1];
			if (tagSplit.charAt(0) == "!") {
				target = tagSet[2];
				tagSplit = tagSplit.substr(1)
			}

			if (tagSplit.charAt(0) == "#") {
				target.push(tagSplit.subtr(1));
			}
			else {
				target.push(tagSplit);
			}
		}
		tagSet[1].sort();
		tagSet[2].sort();
		newTagSets.push(tagSet);
	}

	return newTagSets;
}

function decodeURLTag(tag) {
	return [decodeURIComponent(tag.replace(/-/g, " "))];
}

TumblrListener.prototype.follow = function (ev, blogName, tags) {
	var tumblr = this.tumblr, blog, newTagSets = parseTags(tags, ev.channel);

	// Ensure the blog is known.
	if (!(blogName in this.tumblr.blogs)) {
		blog = tumblr.blogs[blogName] = {
			"blog": new Tumblr.Blog(blogName + ".tumblr.com", this.bot.settings.tumblr.oauth),
			"queries": [],
			"updated": 0,
			"posts": 0
		}
		blog.blog.info(checkUpdated.bind(this, blog));
	}

	// Add queries to the blog.
	Array.prototype.push.apply(tumblr.blogs[blogName].queries, newTagSets);
}

TumblrListener.prototype.followURL1 = function (ev, blogName, tags) {
	return this.follow(ev, blogName[1], tags);
}

TumblrListener.prototype.followURL2 = function (ev, urlParts) {
	return this.follow(ev, urlParts[1], decodeURLTag(urlParts[2]));
}


TumblrListener.prototype.unfollow = function (ev, blogName, tags) {
	var tumblr = this.tumblr, remTagSets = parseTags(tags, ev.channel);

	if (tags) {
		// Remove tags only.
		var blog = tumblr.blogs[blogName];
		if (blog) {
			var queries = blog.queries, deleted = false;
			for (var i=queries.length - 1; i >= 0; --i) {
				// query = [channel, +tags, -tags]
				for (var remTagSet of remTagSets) {
					if (array_compare(remTagSet, queries[i])) {
						// If the channel and tags are all the same then this is to be removed.
						queries.splice(i, 1);
						if (!deleted) {
							this.bot.sender.print(ev.channel, "Unfollowed tag set for blog.");
							deleted = true;
						}
					}
				}
			}
			if (deleted) {
				if (queries.length == 0) {
					// Nothing left to follow.
					this.bot.sender.print(ev.channel, "I'm not following anything else on the blog, so I'm unfollowing the blog.");
					delete tumblr.blogs[blogName];
				}
			} else {
				this.bot.sender.error(ev.channel, [
					"string", "I'm not following that tag set. Try ",
					"code", this.bot.prefix + "tumblr list " + blogName,
					"string", "?"
				]);
			}
		}
	} else {
		// Remove whole blog.
		delete tumblr.blogs[blogName];
		this.bot.sender.print(ev.channel, "Unfollowed blog entirely.");
	}
}

TumblrListener.prototype.unfollowURL1 = function (ev, blogName, tags) {
	return this.unfollow(ev, blogName[1], tags);
}

TumblrListener.prototype.unfollowURL2 = function (ev, urlParts) {
	return this.unfollow(ev, urlParts[1], decodeURLTag(urlParts[2]));
}


function tagSetString(tagSet) {
	// tagSet = [channel, [+tags], [-tags]]
	var msg = "";
	if (tagSet[1].length) msg = "#" + tagSet[1].join(" #");
	if (tagSet[2].length) msg += (msg ? " " : "") + "!#" + tagSet[2].join(" !#");
	return msg;
}

TumblrListener.prototype.list = function (ev, list) {
	// List the tags of all the blogs in list. If list is empty, list all blogs w/o tags.
	var blogs = this.tumblr.blogs;
	if (list.length) {
		for (var blogName of list) {
			if (blogName in blogs) {
				var blog = blogs[blogName];
				var queries = [];
				for (var query of blog.queries) {
					if (query[0] == ev.channel) queries.push(query);
				}

				switch (queries.length) {
				case 0:
					this.bot.sender.error(ev.channel, "I'm not following a blog by the name of " + blogName);
					break;
				case 1:
					this.bot.sender.print(ev.channel, "I am following " + tagSetString(queries[0]) + " from that blog.");
					break;
				default:
					var msg = "I am following posts of these tag sets from " + blogName + ":";
					for (var query of queries) {
						msg += "\n* " + tagSetString(query);
					}
					this.bot.sender.print(ev.channel, msg);
				}
				
			} else {
				this.bot.sender.error(ev.channel, "I'm not following a blog by the name of " + blogName);
			}
		}
	} else {
		var names = [];
		for (var blogName in blogs) {
			names.push(blogName);
		}
		if (names.length) {
			this.bot.sender.print(ev.channel, "Following blogs: " + names.join(", "));
		} else {
			this.bot.sender.print(ev.channel, "I'm not following any blogs for this channel.");
		}
	}
}


TumblrListener.prototype.runQueries = function () {
	var blogs = this.tumblr.blogs;
	for (var blogName in blogs) {
		var blog = blogs[blogName];
		blog.blog.info(checkUpdated.bind(this, blog))
	}

	var queries = this.tumblr.queries;
	for (var i = 0; i < queries.length; ++i) {
		var query = queries[i];

		switch (query[0]) {
		case 0:
			// Query blog for new post with tags case.
			break;
		}
	}
}


function checkUpdated(blog, error, info) {
	var self = this;
	info = info.blog;
	if (error) {
		this.bot.sender.error("Error receiving blog info: " + error);
	}
	else if (info.updated > blog.updated) {
		var need = info.posts - blog.posts + 1, updated = blog.updated;

		// Update the blog.
		blog.posts = info.posts;
		blog.updated = info.updated;

		if (updated == 0) {
			// First run, don't do anything else.
			return;
		}

		blog.blog.posts({
			"filter": "text",
			"limit": Math.min(need, 20),
		}, function (error, response) {
			var queries = blog.queries;
			// If it's more than 20..just ignore them.
			var posts = response.posts, i = posts.length - 1;
			if (posts[i].timestamp > updated) {
				var sentTo = {};
				for (var query of queries) {
					if (!(query[0] in sentTo)) {
						self.bot.sender.print(query[0], [
							"string", "I may have missed some posts from ",
							"no-preview", response.blog.url,
						]);
						sentTo[query[0]] = true;
					}
				}
			}
			else --i;

			for (; i >= 0; --i) {
				// Print out post urls that are newer than we last saw.
				var tags = array2obj(posts[i].tags), sentTo = {};
				if (posts[i].timestamp > updated) {
					// But only if they match the tags.
					for (var query of queries) {
						var fail = false;

						// Don't need to send the same post to a channel more than once.
						if (query[0] in sentTo) continue;

						var ins = query[1], outs = query[2];

						// Ensure all required tags are represented.
						for (var k of ins) {
							if (!(k in tags)) {
								fail = true;
								break;
							}
						}
						if (fail) break;

						// Ensure no forbidden tag is represented.
						for (var k of outs) {
							if (k in tags) {
								fail = true;
								break;
							}
						}
						if (fail) break;

						// We're good, so send it out.
						self.bot.sender.print(query[0], posts[i].post_url);
					}
				}
			}
		});
	}
}

function array2obj(array) {
	var obj = {};
	for (var i = 0; i < array.length; i++) {
		obj[array[i]] = true;
	}
	return obj;
}

function array_compare(array1, array2) {
	var i = array1.length;
	if (i != array2.length) return false;

	for (--i; i >= 0; --i) {
		var a1i = array1[i];
		if (typeof(a1i) == "undefined") {
			if (typeof(array2[i]) != "undefined") return false;
		}
		else if (a1i.constructor.name == "Array") {
			if (array2[i].constructor.name != "Array") return false;
			if (!array_compare(a1i, array2[i])) return false;
		}
		else if (a1i !== array2[i]) return false;
	}

	return true;
}

module.exports = TumblrListener;
