// Server Requirements
var http = require('http');
var fs = require('fs');
var qs = require('querystring');

// Log files
var logdir = 'logs/';
var logpre = 'pathlog_';
var fname = '';

// Countdown to rolling log files
var seconds_till_roll = 0;
var seconds_in_day = 86400;

// MySQL Requirements
var mysql = require('mysql');
var connection = mysql.createConnection({
	host	: 'localhost',
	user	: 'prashanth',
	password: 'gonesl!',
	database: 'dr_logger'
});

var table_format = [
	"(",
//	"user VARCHAR(255),",
	"time BIGINT,",
	"type TINYINT,",
	"val1 DOUBLE,",
	"val2 DOUBLE",
	")"
].join("\n");


// HTTP server Handler
function processPost(request, response, callback){
	var queryData = '';
	if( typeof callback != 'function') return null;
	if( request.method == 'POST' ){
		request.on('data', function(data) {
			queryData += data;
			if(queryData.length > 1e6){
				queryData = '';
				response.writeHead(413, {'Content-Type': 'text/plain'}).end();
				request.connection.destroy();
			}
		});
		
		request.on('end', function() {
			response.post = qs.parse(queryData);
			callback();
		});
	} else {
		response.writeHead(405, {'Content-Type': 'text/plain'});
		response.end();
	}

}

// Log HTTP Post
function logPost( post ){
	// parse
	var type = post.type;
	var time = post.time;
	var val1 = post.val1;
	var val2 = post.val2;
	var user = post.user;

	var data =  user + "," + time + "," + type + "," + val1 + "," + val2;
	var sql_data = time + "," + type + "," + val1 + "," + val2;
	console.log(data);
	fs.appendFile(logdir + fname, data, function(err) {
		if(err){
			console.log(err);
		}
	});;
	
	connection.query('SHOW TABLES;', function(err, rows, fields){
		if(err) throw err;
		var table_exists = false;
		for (var i = 0; i < rows.length; i++) {
			//console.log("Saw table " + rows[i].Tables_in_dr_logger + ", looking for " + user);
			if((rows[i].Tables_in_dr_logger).indexOf(user) >= 0){
			//	console.log("Match");
				table_exists = true;
			}
		}
		if(!table_exists){
			//console.log("Table does not exist.");
			connection.query('CREATE TABLE ' + user + ' ' + table_format + ';', function(err, rows, fields){
				if(err) throw err;
				connection.query("INSERT INTO " + user + " VALUES(" + sql_data + ");");
			});
		}
		else{
			connection.query("INSERT INTO " + user + " VALUES(" + sql_data + ");");
		}
	});
}

// One second tick handler
function tickhandler(){
	seconds_till_roll--;
	if( seconds_till_roll <= 0 ){
		seconds_till_roll = seconds_in_day;
		// roll log file
		var date = new Date();
   		var hour = date.getHours();
    		hour = (hour < 10 ? "0" : "") + hour;
   	 	var min  = date.getMinutes();
    		min = (min < 10 ? "0" : "") + min;
    		var sec  = date.getSeconds();
    		sec = (sec < 10 ? "0" : "") + sec;
    		var year = date.getFullYear();
    		var month = date.getMonth() + 1;
    		month = (month < 10 ? "0" : "") + month;
    		var day  = date.getDate();
    		day = (day < 10 ? "0" : "") + day;
    		fname =  logpre + year + "_" + month + "_" + day + "_" + hour + "_" + min + "_" + sec;
	}
	setTimeout(tickhandler,1000);
}

/*function on_exit(){
	console.log('Closing database connection.');
	connection.end();
	//process.exit();
}

// Setup SIGTERM handler
process.on('SIGINT', on_exit);
process.on('exit', on_exit);*/
connection.connect();

// Fire up HTTP server
var server = http.createServer(function(request, response) {
    if(request.method == 'POST') {
        processPost(request, response, function() {
        	// Use response.post here
	    	logPost(response.post);

        	response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
            response.end();
        });
    } else {
        response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        response.end();
    }

})
server.listen(22056, '0.0.0.0');

// Fire up tick handler
setTimeout(tickhandler, 1000);
