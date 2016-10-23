exports.init = initFileTree;
exports.getFileTree = getFileTree;
exports.Entry = Entry;

var fs = require('fs');
var xmlParser = require('xml2js').Parser();
var root;

function getJsonRelative(file, callback) {
	_getRawJson(__dirname + "/" + file, callback);
}

function _getRawJson(file, callback) {
	fs.readFile(file, function(err, xml) {
		if(err) {
			callback({ error: "Could not read file" });
		} else {
			xmlParser.parseString(xml, function(err, xml_json) {
				if(err) {
					callback({ error: "Could not parse xml" });
				} else {
					callback(xml_json);
				}
			});
		}
	});
}

function initFileTree(listFile, logFile, callback) {
	root = new Entry('/', 'dir');
	getJsonRelative(listFile, function(listJson) {
		var list = listJson.lists.list[0];
		root.path = list.$.path;
		list.entry.forEach(function(entry) {
			var added = root.addEntry(entry.name[0], entry.$.kind, entry.size ? entry.size[0] : null);
		});
		getJsonRelative(logFile, function(logJson) {
			logJson.log.logentry.forEach(function(entry) {
				var commit = new Commit(entry.$.revision, entry.author[0], entry.date[0], entry.msg[0]);
				var entry;
				entry.paths[0].path.forEach(function(pathObj) {
					// get path relative to svn directory from absolute path
					var path = pathObj._.split('/').slice(2).join('/');
					if(entry = root.getEntry(path)) entry.addCommit(commit);
				});
			});
			callback(root);
		})
	});
}

function getFileTree() {
	return root;
}

function Entry(name, type, size) {

	this.name = name;
	this.type = type;
	if(size) this.size = size;
	if(type == 'dir') this.entries = [];
	this.commits = [];
	this.parent = null;

	this._getEntry = function(entryName) {
		for(var i = 0; i < this.entries.length; i++)
			if(this.entries[i].name == entryName) return this.entries[i];
		return null;
	}

	this.getEntry = function(path) {

		if(path == '') return this;

		var pathArray = path.split('/');
		var cur = this;
		for(var i = 0; i < pathArray.length; i++) {
			if(cur == null) return null;
			cur = cur._getEntry(pathArray[i]);
		}
		return cur;
	}

	this.addCommit = function(commit) {
		var i;
		for(i = 0; i < this.commits.length; i++) {
			// maintain chronological order of commits
			if(Commit.compare(commit, this.commits[i]) > 0)
				break;
		}
		this.commits.splice(i, 0, commit);
	}

	this._addEntry = function(entryName, type, size) {
		var added = new Entry(entryName, type, size);
		this.entries.push(added);
		added.parent = this;
	}

	this.addEntry = function(path, type, size) {
		var pathArray = path.split('/');
		var cur = this;
		for(var i = 0; i < pathArray.length; i++) {
			if(cur._getEntry(pathArray[i]) == null) {
				var nextType = (i == (pathArray.length - 1)) ? type : 'dir';
				cur._addEntry(pathArray[i], nextType, size);
			}
			cur = cur._getEntry(pathArray[i]);
		}
		return cur;
	}

	this.getTitle = function() { return this.name; };
	this.getVersion = function() { return this.commits.length > 0 ? this.commits[0].number : ''; };
	this.getDate = function() { return this.commits.length > 0 ? this.commits[0].date.toLocaleString() : ''; };
	this.getSummary = function() { return this.commits.length > 0 ? this.commits[0].message : ''; };
	this.getType = function() {
		if(this.type == 'dir') return 'Directory';
		else return this.name.split('.').slice(-1)[0];
	}
	this.getFullPath = function() {
		var recPath = [];
		var cur = this;
		while(cur != root) {
			recPath.push(cur.name);
			cur = cur.parent;
		}
		return recPath.reverse().join('/');
	}
	this.getUrl = function() { 
		return [root.path, this.getFullPath()].join('/');
	}
	this.getIdentifier = function() {
		return this.name.replace('.', '_');
	}

	return this;
}

function Commit(number, author, dateString, message) {
	
	this.number = number;
	this.author = author;
	this.date = new Date(Date.parse(dateString));
	this.message = message;

	return this;
}

Commit.compare = function(c1, c2) {
	c1.date > c2.date ? 1 :
	c1.date < c2.date ? -1 : 
	0;
}

