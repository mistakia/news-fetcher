/* global require, module */

var social = require('../modules/social');
var async = require('async');
var URI = require('urijs');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?medium.com\/[^@][^/\s]+\/?$/i,

    init: function(opts) {
	return {

	    type: 'medium collection',

	    getLogo: function(html) {
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var image = $('meta[property="og:image"]').attr('content');
		return image || null;
	    },

	    build: function(source, cb) {
		var self = this;

		request({
		    method: 'GET',
		    uri: this.url,
		    followAllRedirects: true
		}, function (error, response, body) {

		    if (error) {
			cb(error);
			return;
		    }
		    
		    source.data = {};
		    source.feed_url = response.request.uri.href;
		    
		    try {
			var str = /window\[\"obvInit\"\]\(([\s\S]+)\/\/ \]\]/ig.exec(body)[1];

			str = str.replace(/\)([^\)]*)$/,'$1');
			var globals = JSON.parse(str);
			source.data = globals;
			source.title = source.data.collection.name;
		    } catch(e) {
			opts.log.error(e);
		    }

		    source.logo_url = self.getLogo(body);

		    cb();
		});
	    },

	    getStats: function(id, cb) {
		request({
		    method: 'GET',
		    uri: 'https://medium.com/p/' + id + '/upvotes',
		    headers: {
			'accept': 'application/json'
		    }
		}, function(error, response, body) {
		    if (error) {
			cb(error);
			return;
		    }

		    var count = 1;
		    var data;
		    try {
			data = body.substring(16);
			count = JSON.parse(data).payload.value.count;
		    } catch(e) {
			opts.log.error(e, {
			    id: id,
			    data: data
			});
		    }

		    cb(null, count);
		});
	    },	    

	    buildPost: function(entry, cb) {
		var self = this;
		var url = new URI(this.url).segment(1, entry.uniqueSlug).toString();
		async.parallel({
		    social: function(next) {
			social.all(url, next);
		    },
		    medium: function(next) {
			self.getStats(entry.id, next);
		    }
		}, function(err, results) {
		    cb(err, {
			title: entry.title,
			content_url: null,
			score: results.medium || 1,
			social_score: results.social.total,
			url: url
		    });
		});
	    },	    

	    getPosts: function(source, cb) {
		var self = this;
		source.posts = [];
		
		if (!source.data) {
		    cb('missing data');
		    return;
		}

		var posts = [];

		for (k in source.data.references.Post)
		    posts.push(source.data.references.Post[k]);

		async.mapLimit(posts, 2, this.buildPost.bind(this), function(err, results) {
		    source.posts = results;
		    cb(err);
		});
	    }
	};
    }
};
