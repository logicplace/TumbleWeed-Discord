// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Tumblr = require("tumblr");
const deep_equal = require("deep-equal");

function TumblrListener(Bot) {
	// Register commands
	var registrar = Bot.registrar(this);
	registrar.command("tumblr follow _ ^*", this.follow);
	registrar.command("follow #<?https?://(.*)\\.tumblr\\.com/?>?$# ^*", this.followURL1);
	registrar.command("follow #<?https?://(.*)\\.tumblr\\.com/tagged/(.*?)>?$#", this.followURL2);

	registrar.command("tumblr unfollow _ ^*", this.unfollow);
	registrar.command("unfollow #<?https?://(.*)\\.tumblr\\.com/?>?$# ^*", this.unfollowURL1);
	registrar.command("unfollow #<?https?://(.*)\\.tumblr\\.com/tagged/(.*?)>?$#", this.unfollowURL2);

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

	// Setup instance
	this.tumblr = Bot.loadMemory("tumblr", {
		"blogs": {},
	});

	// Make connections to all saved blogs
	this.blogs = {};
	for (let blog in this.tumblr.blogs) {
		this.blogs[blog] = new Tumblr.Blog(this.tumblr.blogs[blog].blog, Bot.settings.tumblr.oauth);
	}

	setInterval(this.runQueries.bind(this), 10 * 60 * 1000);
	this.onInit = this.runQueries.bind(this);
}

function parseTags(tags, context) {
	var newTagSets = [];
	// Parse the tags.
	for (var i = 0; i < tags.length; ++i) {
		// Each "tag" is a group of tags separated by commas.
		// All tags must be represented in selected posts.
		// If a tag is prefixed with a !, it is negated.
		// Tags may have a # (following any !) but it's not required.
		var tagSplits = tags[i].split(","), tagSet = [context, [], []];
		for (var j = 0; j < tagSplits.length; j++) {
			var tagSplit = tagSplits[j];
			var target = tagSet[1];
			if (tagSplit.charAt(0) == "!") {
				target = tagSet[2];
				tagSplit = tagSplit.substr(1)
			}

			if (tagSplit.charAt(0) == "#") {
				target.push(tagSplit.substr(1));
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
	if (!ev.authority.content) {
		ev.reply.error("tumblr.cmd.follow.no-permission");
		return;
	}
	
	var tumblr = this.tumblr, blog, newTagSets = parseTags(tags, ev.context);

	// Ensure the blog is known.
	if (!(blogName in this.tumblr.blogs)) {
		blog = tumblr.blogs[blogName] = {
			"blog": blogName + ".tumblr.com",
			"queries": [],
			"updated": 0,
			"posts": 0
		}
		var conn = this.blogs[blogName] = new Tumblr.Blog(blog.blog, this.bot.settings.tumblr.oauth);
		conn.info(checkUpdated.bind(this, blogName));
	}

	// Add queries to the blog.
	Array.prototype.push.apply(tumblr.blogs[blogName].queries, newTagSets);
	ev.reply.print("tumblr.cmd.follow.success");
}

TumblrListener.prototype.followURL1 = function (ev, blogName, tags) {
	return this.follow(ev, blogName[1], tags);
}

TumblrListener.prototype.followURL2 = function (ev, urlParts) {
	return this.follow(ev, urlParts[1], decodeURLTag(urlParts[2]));
}


TumblrListener.prototype.unfollow = function (ev, blogName, tags) {
	if (!ev.authority.content) {
		ev.reply.error("tumblr.cmd.unfollow.no-permission");
		return;
	}

	var tumblr = this.tumblr, remTagSets = parseTags(tags, ev.context);

	if (tags) {
		// Remove tags only.
		var blog = tumblr.blogs[blogName];
		if (blog) {
			var queries = blog.queries, deleted = false;
			for (var i=queries.length - 1; i >= 0; --i) {
				// query = [channel, +tags, -tags]
				for (var remTagSet of remTagSets) {
					if (deep_equal(remTagSet, queries[i])) {
						// If the channel and tags are all the same then this is to be removed.
						queries.splice(i, 1);
						if (!deleted) {
							ev.reply.print("tumblr.cmd.unfollow.tags.success");
							deleted = true;
						}
					}
				}
			}
			if (deleted) {
				if (queries.length == 0) {
					// Nothing left to follow.
					ev.reply.print("tumblr.cmd.unfollow.tags.also-blog");
					delete tumblr.blogs[blogName];
				}
			} else {
				ev.reply.error("tumblr.cmd.unfollow.tags.not-found", {"blog": blogName});
			}
		}
	} else {
		// Remove whole blog.
		delete tumblr.blogs[blogName];
		ev.reply.print("tumblr.cmd.unfollow.blog.success");
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
					if (query[0] == ev.context) queries.push(query);
				}

				switch (queries.length) {
				case 0:
					ev.reply.error("tumblr.cmd.list.not-found", {"blog": blogName});
					break;
				case 1:
					ev.reply.print("tumblr.cmd.list.tagset1", {
						"blog": blogName,
						"tags": tagSetString(queries[0])
					});
					break;
				default:
					var msg = "";
					for (var query of queries) {
						msg += "\n* " + tagSetString(query);
					}
					ev.reply.print([
						"string", "tumblr.cmd.list.tagsets",
						"string", msg
					], {"blog": blogName});
				}
				
			} else {
				ev.reply.error("tumblr.cmd.list.not-found", {"blog": blogName});
			}
		}
	} else {
		var names = [];
		for (var blogName in blogs) {
			names.push(blogName);
		}
		if (names.length) {
			ev.reply.print([
				"string", "tumblr.cmd.list.blogs",
				"string", names.join(", ")
			]);
		} else {
			ev.reply.print("tumblr.cmd.list.no-blogs");
		}
	}
}


TumblrListener.prototype.runQueries = function () {
	var blogs = this.tumblr.blogs;
	for (var blogName in blogs) {
		this.blogs[blogName].info(checkUpdated.bind(this, blogName))
	}
}


function checkUpdated(blogName, error, info) {
	var self = this;
	info = info.blog;

	var blog = this.tumblr.blogs[blogName];
	var conn = this.blogs[blogName];

	if (error) {
		this.bot.sender.error("tumblr.update.error", {"error": error});
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

		conn.posts({
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
						self.bot.sender.print(query[0], "tumblr.update.missed", {"url": response.blog.url});
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
						sentTo[query[0]] = true;

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

module.exports = TumblrListener;
