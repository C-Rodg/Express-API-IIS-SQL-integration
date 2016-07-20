exports.sqlSearchBuilderCatalog = function (search) {
	return "SELECT Name, PreviewName, TestDateTime, ConfigGuid, Archived FROM Events WHERE Name Like '%" + search + "%'" + " ORDER BY DateTime DESC";
};

exports.sqlSearchAllBuilderCatalog = function () {
	return "SELECT Name, PreviewName, TestDateTime, ConfigGuid, Archived FROM Events ORDER BY EventDateTime DESC";
};

exports.sqlMarkColumn = function (db, table, column, result, columnFind, columnFindValue) {
      return "USE " + db + " UPDATE " + table + " SET " + column + "='" + result + "' WHERE " + columnFind + "='" + columnFindValue + "'";
};

exports.sqlBuilderConnection = function () {
	return "Driver={SQL Server Native Client 10.0};Server={TEST\\SQLEXPRESS};Database={TestCatalog};Uid={USERNAME};Pwd={PASSWORD};";
};

exports.sqlHannahConnection = function () {
	return "Driver={SQL Server Native Client 10.0};Server={TEST\\SQLEXPRESS};Database={TestCatalog};Uid={USERNAME};Pwd={PASSWORD};";
};

exports.sqlBuilderPrintSettings = function (printConfiguration) {
	return "INSERT INTO PrintSettings (Configuration, OnSiteModifiedDateTime, UploadGuid, Uploaded) VALUES ('" +
			printConfiguration + "', GETDATE(), NEWID(), 1) ";
};

exports.sqlBuilderEventSettings = function (eventSettings) {
	return " INSERT INTO EventSettings (BadgePrefix, Configuration) VALUES ('T', '" + eventSettings + "')";
};

exports.sqlCreateEvent = function () {
	return "CREATE ...";
};