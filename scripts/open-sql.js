const stringSql = require('../scripts/sql-strings'),
		sql 	 = require('msnodesqlv8'),
		moment 	 = require('moment'),
		uuid  	 = require('node-uuid'),
		fs 		 = require('fs'),
		Promise  = require('bluebird'),
		ncp 	 = require('ncp').ncp;
		ncp.limit = 16;
		that = this;

exports.searchConfigEvents = function (response, searchAll, searchItem) {
	var promise = new Promise(function(resolve, reject) {
		var search = '';
		if (searchAll) {
			search = stringSql.sqlSearchAllBuilderCatalog();
		} else {
			search = stringSql.sqlSearchBuilderCatalog(searchItem);
		}
		sql.open(stringSql.sqlBuilderConnection(), function(err, conn) {
			if (err) {
				console.log(err);
				reject({'success' : false});
			}
			conn.queryRaw(search, function(err, results) {
				if (err) {
					console.log(err);
					reject({'success' : false});
				}
				var events = [];
				if(results && results.rows){
					for (var i = 0; i < results.rows.length; i++) {
						events.push({
							eventName : results.rows[i][0],
							previewName : results.rows[i][1],
							startDate : moment(results.rows[i][2]).format("MMM DD, YYYY"),
							guid 	  : results.rows[i][3],
							archived  : results.rows[i][4]
						});
					}
				}
				resolve(events);
			});
		});
	});
	return promise;	
};

exports.removeFromIIS = function(previewName) {
	var year = previewName.substring(0,4);
	var promise = new Promise(function(resolve, reject) {
		var exec = require('child_process').exec,
		ls 		 = exec('APPCMD delete app /app.name:"Default Web Site/' + previewName + '/Services"', function (error, stdout, stderr) {
			if (error !== null){
				console.log(error);
				reject({'success' : false});
			}
			else {
				ls = exec('APPCMD delete vdir /vdir.name:"Default Web Site/' + previewName + '"', function (error, stdout, stderr) {
					if (error !== null) {
						console.log(error);
						reject({'success' : false});
					}
					resolve({'success' : true});
				});
			}
		});
	});
	return promise;
};

exports.markArchived = function(archiveStatus, guid) {
	var promise = new Promise(function(resolve, reject) {
		sql.open(stringSql.sqlBuilderConnection(), function(err, conn) {
			if (err) {
				console.log(err);
				reject({'success' : false});
			}
			conn.queryRaw(stringSql.sqlMarkColumn('TestCatalog', 'Events', 'Archived', archiveStatus, 'ConfigGuid', guid), function(err, results) {
				if (err) {
					console.log(err);
					reject({'success' : false});
				}
				resolve({'success' : true});
			});
		});
	});
	return promise;
};

exports.editConfigEvent = function (response, guid, configObject) {
	var promise = new Promise(function(resolve, reject) {
		sql.open(stringSql.sqlBuilderConnection(), function(err, conn) {
			if (err) {
				console.log(err);
				reject({'success' : false});
			}
			var updateEventQuery = "USE [Test_" + guid + "] UPDATE EventSettings SET Configuration = '" + configObject + "'; ";
				updateEventQuery += "USE TestCatalog UPDATE Events SET EditDateTime = GETDATE() WHERE ConfigGuid = '" + guid + "';";
			conn.queryRaw(updateEventQuery, function(err, results) {
				if (err) {
					console.log(err);
					reject({'success' : false});
				}
				resolve({'success' : true});
			});			
		});
	});
	return promise;	
};

exports.createConfigEvent = function (response, previewName, eventName, eventDate, configObject) {
	var guid = uuid.v4();
	var date = moment(eventDate, "YYYY MM DD");
	var year = String(date.year());
	var promise = new Promise(function(resolve, reject) {
		var copyPromise = that.copyStandardContent(previewName, year);
		copyPromise.then(function(val){
			var readWebPromise = that.readWebConfig(previewName, year);
			var readPrintPromise = that.readPrintSettings(previewName, year);
			return Promise.join(readWebPromise, readPrintPromise, function(webConfig, printSettings) {
				var writeWebPromise = that.writeWebConfig(previewName, year, guid, webConfig);				
				var createSpecDBPromise = that.createSpecificDatabase(guid);
				return Promise.join(writeWebPromise, createSpecDBPromise, function(webWrite, createDB) {
					var createSettingsPromise = that.createEventSettingsDb(guid, printSettings, configObject, eventName, previewName, date);
					var addIISPromise = that.addToIIS(previewName, year);
					return Promise.join(createSettingsPromise, addIISPromise, function(settings, iis) {
						resolve({'success' : true});
					}).catch(function(error) {
						console.log(error);
						reject({'success' : false});
					});
				}).catch(function(error) {
					console.log(error);
					reject({'success' : false});
				});
			}).catch(function(error){
				console.log(error);
				reject({'success' : false});
			});
		}, function(err) {
			console.log(err);
			reject({'success' : false});
		});
	});
	return promise;
};

exports.copyStandardContent = function (previewName, year) {
	var promise = new Promise(function(resolve, reject) {
		ncp("C:\\Content\\Tools\\standard-content", "C:\\Content\\" + year + "\\" + previewName, function(err) {
			if(err) {
				console.log(err);
				reject({'success' : false});
			}
			resolve();
		});
	});
	return promise;
};

exports.readWebConfig = function(previewName, year) {
	var promise = new Promise(function(resolve, reject) {
		fs.readFile("C:\\Content\\" + year + "\\" + previewName + "\\V4.0\\web.config", 'utf8', function(err, data) {
			if(err) {
				console.log(err);
				reject({'success' : false});
			}
			resolve(data);
		});
	});
	return promise;
};

exports.writeWebConfig = function(previewName, year, guid, data) {
	var result = data.replace(/new-db-name/g, guid);
	var promise = new Promise(function(resolve, reject) {
		fs.writeFile("C:\\Content\\" + year + "\\" + previewName + "\\V4.0\\web.config", result, 'utf8', function(err) {
			if(err) {
				console.log(err);
				reject({'success': false});
			}
			resolve();
		});
	});
	return promise;
};

exports.readPrintSettings = function(previewName, year) {
	var promise = new Promise(function(resolve, reject) {
		fs.readFile("C:\\Content\\" + year + "\\" + previewName + "\\printSettings.xml", "utf8", function(err, data) {
			if (err) {
				console.log(err);
				reject({'success' : false});
			}
			resolve(data);
		});
	});
	return promise;
};

exports.createSpecificDatabase = function (guid) {
	var promise = new Promise(function(resolve, reject) {
		var createSpecificEventQuery = "USE master CREATE DATABASE [Test_" + guid + "] ";
		sql.open(stringSql.sqlBuilderConnection(), function(err, conn) {
			if(err) {
				console.log(err);
				reject({'success' : false});
			}
			conn.queryRaw(createSpecificEventQuery, function(err, results) {
				if (err) {
					console.log(err);
					reject({'success' : false});
				}
				resolve();
			});
		});
	});
	return promise;
};

exports.createEventSettingsDb = function (guid, printSettings, configObject, eventName, previewName, date) {
	var createEventQuery = "USE [Test_" + guid + "] " + stringSql.sqlCreateEvent() + " ";
				createEventQuery 	+= stringSql.sqlBuilderPrintSettings(printSettings) + " ";
				createEventQuery 	+= stringSql.sqlBuilderEventSettings(configObject) + " ";
				createEventQuery 	+= "USE TestCatalog INSERT INTO Events (ConfigGuid, EditDateTime, EventDateTime, Name, Preview, Archived) VALUES('" + guid + "', " + "GETDATE(), '" + date.format() + "', '" + eventName +"', '" + previewName + "', 0)";
	var promise = new Promise(function(resolve, reject){
		sql.open(stringSql.sqlBuilderConnection(), function(err, conn) {
			if (err) {
				console.log(err);
				reject({'success': false});
			}
			conn.queryRaw(createEventQuery, function(err, results) {
				if (err) {
					console.log(err);
					reject({'success' : false});
				}
				resolve();
			});
		});
	});
	return promise;
};

exports.addToIIS = function (previewName, year) {
	var promise = new Promise(function(resolve, reject) {
		// Add virtual directory and app to IIS
		var exec = require('child_process').exec;
		var ls = exec('APPCMD add vdir /app.name:"Default Web Site/" /path:/' + previewName + ' /physicalPath:C:\\Content\\' + year + '\\' + previewName + '\\V4.0', function (error, stdout, stderr) {
			console.log("stdout: " + stdout);
			console.log("stderr: " + stderr);
			if (error !== null) {
				console.log("ERROR: adding to IIS - " + error);	
				reject({'success' : false});							
			} else {
				ls = exec('APPCMD add app /site.name:"Default Web Site" /path:/' + previewName + '/Services /physicalPath:"C:\\Program Files (x86)\\TestOrg\\YourServices V1.0"', function (error, stdout, stderr) {
					console.log('stdout: ' + stdout);
					console.log('stderr: ' + stderr);
					if (error !== null) {
						console.log("ERROR: adding app to IIS - " + error);
						reject({'success' : false});
					}
					resolve();
				});
			}
		});
	});
	return promise;
};