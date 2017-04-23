// TumbleWeed Discord Tumblr bot
// Copyright 2017 Sapphire Becker (logicplace.com)
// MIT Licensed

const Tumblr = require("tumblr");

module.exports = function (Bot) {
	// Register commands
	Bot.registerCommand("tumblr follow _ *", follow);
	Bot.registerCommand("follow #https?://(.*)\\.tumblr\\.com/?$# *", followURL1);
	Bot.registerCommand("follow #https?://(.*)\\.tumblr\\.com/tagged/(.*)$#", followURL2);

	Bot.registerCommand("tumblr unfollow _ *", unfollow);
	Bot.registerCommand("unfollow #https?://(.*)\\.tumblr\\.com/?# *", unfollowURL1);
	Bot.registerCommand("unfollow #https?://(.*)\\.tumblr\\.com/tagged/(.*)#", unfollowURL2);

	// Help hooks
	Bot.registerHelp("tumblr", {
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

	Bot.registerHelp("follow", {
		"command": "follow TumblrURL [Tags]",
	});

	// Setup instance
	this.tumblr = Bot.loadMemory("tumblr") || {
		"blogs": {},
		"queries": [],
	};

	setInterval(runQueries.bind(Bot), 10 * 60 * 1000);
}

function parseTags(tags) {
	var newTagSets = [];
	// Parse the tags.
	for (var i = 0; i < tags.length; ++i) {
		// Each "tag" is a group of tags separated by commas.
		// All tags must be represented in selected posts.
		// If a tag is prefixed with a !, it is negated.
		// Tags may have a # (following any !) but it's not required.
		var tagSplits = tags[i].split(","), tagSet = [this.channel, [], []];
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
		newTagSets.push(tagSet);
	}

	return newTagSets;
}

function follow(blogName, tags) {
	var tumblr = this.bot.tumblr, blog, newTagSets = parseTags(tags);

	// Ensure the blog is known.
	if (!(blogName in this.tumblr.blogs)) {
		blog = tumblr.blogs[blogName] = {
			"blog": new Tumblr.Blog(blogName + ".tumblr.com", this.bot.settings.tumblr.oauth),
			"queries": [],
		}
		blog.blog.info(checkUpdated.bind(this, blog));
	}

	// Add queries to the blog.
	Array.prototype.push.apply(tumblr.blogs[blogName].queries, newTagSets);
}

function followURL1(blogName, tags) {
	return follow(blogName[1], tags);
}

function followURL2(urlParts) {
	return follow(urlParts[1], urlParts[2]);
}


function unfollow(blogName, tags) {
	var tumblr = this.bot.tumblr, newTagSets = parseTags(tags);

	if (tags) {
		// Remove tags only.
		var blog = tumblr.blogs[blogName];
		if (blog) {
			for (var query in blog.queries) {
				// query = [[channel, +tags, -tags], ...]

			}
		}
	} else {
		// Remove whole blog.
		delete tumblr.blogs[blogName];
	}
}

function unfollowURL1(blogName, tags) {
	return unfollow(blogName[1], tags);
}

function unfollowURL2(urlParts) {
	return unfollow(urlParts[1], urlParts[2]);
}


function runQueries() {
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


function checkUpdated(blog, info) {
	if (info.updated > blog.updated) {
		var need = info.posts - blog.posts + 1, updated = blog.updated;

		// Update the blog.
		blog.updated = info.updated;

		blog.blog.posts({
			"filter": "text",
			"limit": Math.min(need, 20),
		}, function (response) {
			var queries = blog.queries;
			// If it's more than 20..just ignore them.
			var posts = response.posts, i = posts.length - 1;
			if (posts[i].timestamp > blog.updated) {
				for (var j = 0; j < queries.length; j++) {
					this.sender.print(queries[j][0], [
						"string", "I may have missed some posts from ",
						"no-preview", response.blog.url,
					]);
				}
			}
			else --i;

			for (; i >= 0; --i) {
				// Print out post urls that are newer than we last saw.
				var tags = array2obj(posts[i].tags), sentTo = {};
				if (posts[i].timestamp > updated) {
					// But only if they match the tags.
					for (var j = 0; j < queries.length; j++) {
						var fail = false;
						var query = queries[j];

						// Don't need to send the same post to a channel more than once.
						if (query[0] in sentTo) continue;

						var ins = query[1], outs = query[2];

						// Ensure all required tags are represented.
						for (var k = 0; k < ins.length; ++k) {
							if (!(ins[k] in tags)) {
								fail = true;
								break;
							}
						}
						if (fail) break;

						// Ensure no forbidden tag is represented.
						for (var k = 0; k < outs.length; ++k) {
							if (outs[k] in tags) {
								fail = true;
								break;
							}
						}
						if (fail) break;

						// We're good, so send it out.
						this.sender.print(query[0], posts[i].post_url);
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
