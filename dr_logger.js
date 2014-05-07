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

	var data = time + "," + type + "," + val1 + "," + val2 + "\n";
	console.log(data);
	fs.appendFile(logdir + fname, data, function(err) {
		if(err){
			console.log(err);
		}
	});;
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
