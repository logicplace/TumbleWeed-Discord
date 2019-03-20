# TumbleWeed #

NOTE (2019-03-19): This bot is trash and is causing me problems. I'm not going to put it back up until I remake it better, which may be never. Feel free to self-host, though.

It's a Discord bot that tells you the latest from social media!

Have it follow certain people or whatever and share the link in a channel of your choice.

It currently supports Tumblr and Twitter.

## How to use this bot ##

When it joins your server for the first time it will create two new roles: TumbleWeed Admin and TumbleWeed Content Provider. You may rename these if you want.

The bot will check for updates every 10 minutes and saves its data every hour (also when you close it).

### Unrestricted commands ###

* tw!help [Command] - Help info!
* tw!tumblr list - List all Tumblr blogs the bot is following for this channel.
* tw!tumblr list BlogName - List all tagsets the bot is following on this blog for this channel.
* tw!twitter list - List all Twitter searches the bot is following on this channel.

### Admin commands ###

* tw!nick NickName - Change the bot's nickname
* tw!prefix - Change the command prefix (tw! by default) for this server.

### Content Provider commands ###

* tw!follow URL - Follow a Tumblr blog (optionally with a tag) URL or a Twitter search URL.
* tw!unfollow URL - Unfollow a Tumblr blog (optionally with a tag) URL.
* tw!tumblr follow BlogName [Tags] - Follow a certain blog in this channel and optionally filter by certain tagsets (see below).
* tw!tumblr unfollow BlogName - Unfollow this blog in this channel entirely.
* tw!tumblr unfollow BlogName Tags - Unfollow these tagsets for this blog in this channel.
* tw!twitter follow Search - Follow a Twitter search in this channel.
* tw!twitter follow_original Search - Follow a Twitter search in this channel, but only share statuses that are not retweets.
* tw!twitter unfollow SearchIndexes - Unfollow a Twitter search in this channel by index (given in the list).

### Tumblr ###

Tumblr following is done by scanning specific blogs for new posts. If tags are supplied, it will filter those posts by the given tags.

In the commands, BlogName is the blog's username (the part in the URL). And Tags refers to a tagset system such that each tag set is separated by spaces and each tag within a tagset is separated by commas. Negations are indicated by a ! preceeding the #. # is optional.

Thus `#hi,#there,!#jerk #puppies` follows two tagsets and thus two types of posts for this blog. All posts that contain both the tags #hi and #there and **do not** contain #jerk will be relayed, also all the posts with the tag #puppies will be relayed (regardless of it containing #hi, #there, or #jerk tags). In that way you can think of commas as "and" operations and spaces as "or" operations.

If a tag itself contains a space, you may use double quotes to quote the entire tagset.

### Twitter ###

Twitter follows given searches instead of blogs. You are limited on the complexity of these searches by the API, however the bot will not tell you.

You can find the search syntax [here](https://dev.twitter.com/rest/public/search#query-operators).

Sometimes, despite using "from:" syntax, it seems to return some wrong statuses. This was particularly true when I used "filter:images". Thus, I have implemented a software workaround for filter:images to make it work. There's nothing special you need to know about it, though (you may type filter:images as normal). But, if it's sharing wrong statuses, it may be the API.

Since searches are complex, I didn't provide a URL version of unfollow for it. However, you may use `tw!twitter list` to see a list of searches active in this channel with numerical indexes provided, then you may unfollow by using those.

## Invite to your server ##

~~You can use [this link](https://discordapp.com/oauth2/authorize?client_id=306492836461936640&scope=bot&permissions=335547392) to invite it.~~

NOTE (2019-03-19): This bot is trash and is causing me problems. I'm not going to put it back up until I remake it better, which may be never. Feel free to self-host, though.

It will try to create custom roles for permissions. If denied, then it will go off of user permissions:

* TumbleWeed Administrator: Guild owner or Administrator permission
* TumbleWeed Content Provider: Embed Links and Manage Messages

However, if you want a custom avatar or want to avoid rate limiting (on the social media sites) you'll need to run your own.

## How to run your own ##

1. Clone the repo.
2. Make the memory directory. (TODO: Automate this)
3. Install the dependencies.
4. Copy the settings.
5. Add your OAuth info and Discord Bot token to your settings file.
6. Run the bot.

As a shell script:

	git clone -b release https://github.com/logicplace/TumbleWeed-Discord
	mkdir memory
	npm install
	cp settings-example.json settings.json
	vim settings.json
	node tumbleweed.js

### Get Tumblr OAuth keys ###

You may go [here](https://www.tumblr.com/oauth/apps) to register a new application.

You can put anything for the Default callback URL. TumbleWeed's is http://tumbleweed.logicplace.com/tumblr/auth

I suggest something ugly for the name.

Afterwards, the new application will appear in your list. Put its "OAuth Consumer Key" in tumblr.oauth.consumer\_key and click "show secret key" to reveal the "Secret Key" and put it in tumblr.oauth.consumer\_secret

### Get Twitter OAuth keys ###

You may go [here](https://apps.twitter.com/) to create a new application.

You can put anything for the website. TumbleWeed's is http://tumbleweed.logicplace.com

I suggest something ugly for the name.

Afterwards, go to the Keys and Access Tokens tab of the new application. Put the "Consumer Key (API Key)" in twitter.oauth.consumer\_key and the "Consumer Secret (API Secret)" into twitter.oauth.consumer\_secret

### Create a Discord bot ###

You may go [here](https://discordapp.com/developers/applications/me) to create a new app.

You must add a redirect URI but you can put anything for it. TumbleWeed's is http://tumbleweed.logicplace.com/discord/auth

Put your custom avatar as the App Icon.

Afterwards, select to add a bot to this. Reveal its token to put in the settings under discord.token
