var assert = require('assert');
var svn = require('../svn-parse.js');
var Entry = svn.Entry;

var testList = 'data/test_list.xml';
var testLog = 'data/test_log.xml';

describe('svn-parse', function() {
	describe('init', function() {

		it('creates a non-null root with entries', function(done) {
			svn.init(testList, testLog, function(root) {
				assert(root);
				assert(root.entries.length > 0);
				assert(root.path);
				done();
			});
		});

		it('creates the proper file structure', function(done) {
			svn.init(testList, testLog, function(root) {

				assert.equal(root.path, "https://subversion.ews.illinois.edu/svn/fa16-cs242/sokrent2");
				assert.equal(root.type, 'dir');
				assert.equal(root.entries.length, 1);

				var entry = root.getEntry("Assignment0");
				assert(entry);
				assert.equal(entry.type, 'dir');
				assert.equal(entry.entries.length, 1);

				var file = entry.getEntry('.classpath');
				assert(file);
				assert.equal(file.type, 'file');

				done();
			});
		});

		it('includes all commits', function(done) {
			svn.init(testList, testLog, function(root) {

				var entry = root.getEntry("Assignment0");
				assert.equal(entry.commits.length, 1);
				assert.equal(entry.commits[0].message, "first");

				var file = entry.getEntry('.classpath');
				assert.equal(file.commits.length, 2);
				assert.equal(file.commits[0].message, "first");
				assert.equal(file.commits[1].message, "change classpath");
				
				done();
			});
		});

	});

	describe('Entry', function() {

		var root;

		beforeEach(function() {
			root = new Entry('/', 'dir');
			for(var i = 0; i < 5; i++) root.addEntry('dir' + i, 'dir');
			for(var i = 0; i < 5; i++) root.getEntry('dir0').addEntry('file' + i, 'file', i);
		});

		it('gets entry in nested directory', function() {
			assert(root.getEntry('dir0/file0'));
			assert.equal(root.getEntry('dir0/file0').name, 'file0');
		});

		it('adds entry in nested directory', function() {
			assert(root.addEntry('dir1/file0'), 'file', 1000);
			assert.equal(root.getEntry('dir1/file0').name, 'file0');
		});

		it('adds entry in nonexistent nested directory', function() {
			assert(root.addEntry('new_dir/new_file'), 'file', 777);
			assert.equal(root.getEntry('new_dir/new_file').name, 'new_file');
		});
		
	});

});
