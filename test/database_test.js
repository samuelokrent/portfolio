var assert = require('assert');
var db = require('../database.js');

describe('database', function() {

	before(function(done) {
		// initialize test database connection
		db.init(done, true);
	});

	beforeEach(function(done) {
		db.deleteAllComments(done);
	});

	describe('sanitizeInputes', function() {
		
		it('guards against XSS', function(done) {
			db.sanitizeInputs(['<script>alert("hi")</script>'], function(san) {
				assert.equal(san[0], '&lt;script&gt;alert("hi")&lt;/script&gt;');
				done();
			});
		});

		it('filters out red flags', function(done) {
			db.sanitizeInputs(['red1 red2!'], function(san) {
				assert.equal(san[0], 'RED1 RED2!');
				done();
			});
		});

	});

	describe('addComment', function() {
		
		it('adds a comment to the database', function(done) {
			db.addComment("author", "some content", "file1", null, function() {
				db.fetchComments("file1", function(comments) {
					assert.equal(comments[0].author, "author");
					assert.equal(comments[0].content, "some content");
					assert.equal(comments[0].file, "file1");
					assert.equal(comments[0].parent_id, null);
					done();
				});
			});
		});

		it('guards against SQL injection', function(done) {
			db.addComment("author", "' || 1 #", "file1", null, function() {
				db.fetchComments("file1", function(comments) {
					assert.equal(comments[0].content, "' || 1 #");
					done();
				});
			});
		});

	});

	describe('fetching comments', function() {

		describe('fetchComments', function() {
			it('returns tree of comments', function(done) {
				db.addComment("a", "a", "file1", null, function() {
				db.addComment("a", "a", "file1", 1, function() {
				db.addComment("a", "a", "file1", 2, function() {
				db.addComment("a", "a", "file1", 1, function() {
				db.addComment("a", "a", "file1", null, function() {

					db.fetchComments("file1", function(comments) {
						assert.equal(comments.length, 2);
						assert.equal(comments[0].comments.length, 2);
						assert.equal(comments[0].comments[0].comments.length, 1);
						assert.equal(comments[1].comments.length, 0);
						done();
					});			

				})})})})})
			});
		});

		describe('fetchCommentList', function() {
			it('returns list of comments', function(done) {
				db.addComment("a", "a", "file1", null, function() {
				db.addComment("a", "a", "file1", 1, function() {
				db.addComment("a", "a", "file1", 2, function() {
				db.addComment("a", "a", "file1", 1, function() {
				db.addComment("a", "a", "file1", null, function() {

					db.fetchCommentList("file1", function(comments) {
						assert.equal(comments[0].level, 0);
						assert.equal(comments[1].level, 1);
						assert.equal(comments[2].level, 2);
						assert.equal(comments[3].level, 1);
						assert.equal(comments[4].level, 0);
						done();
					});

				})})})})})
			});
		});

	});

});
