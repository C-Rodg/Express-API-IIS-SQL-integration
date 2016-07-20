// Require Modules
const express = require('express'),
	  app = express(),
	  bodyParser = require('body-parser'),
	  openSql = require('./scripts/open-sql');
	  
// Module Settings
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/testApi/createEvent', function(req, res) {
	var edit = (req.body.edit === 'true');
	var eventSettingsString = String(req.body.configObject);
	eventSettingsString = eventSettingsString.replace(/\'/g, "''");
	if(!eventSettingsString) {
		return false;
	}
	if(edit) {
		var eventPromise = openSql.editConfigEvent(res, req.body.id, eventSettingsString);
	} else {
		var eventPromise = openSql.createConfigEvent(res, req.body.preview, req.body.name, req.body.eventDate, eventSettingsString);
	}
	
	eventPromise.then(function(val) {
		return res.send(val);
	}, function(err) {
		return res.send(err);
	});
});

app.get('/testApi/getEvents', function(req, res) {
	if(req.query.search){
		var searchPromise = openSql.searchConfigEvents(res, false, req.query.search);
	} else {
		var searchPromise = openSql.searchConfigEvents(res, true);
	}	
	searchPromise.then(function(val) {
		return res.send(val);
	}, function(err) {
		return res.send(err);
	});
});

app.post('/testApi/archiveToggle', function(req, res) {	
	var archivedPromise = openSql.markArchived(req.body.archived, req.body.guid);
	archivedPromise.then(function(val) {
		if(req.body.archived === '1'){
			var iisPromise = openSql.removeFromIIS(req.body.preview);
		} else {
			var iisPromise = openSql.addToIIS(req.body.preview, req.body.preview.substring(0,4));
		}
		iisPromise.then(function(){
			return res.send({'success' : true});
		}, function(err) {
			return res.send(err);
		});	
	}, function(err) {
		console.log(err);
		return res.send(err);
	});	
});

// Serve static event builder content
app.use('/event-builder', express.static(__dirname + '/public'));

app.listen(3000, function () {
	console.log('Event Builder is now running on port 3000');
});