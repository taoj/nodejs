var fs = require('fs');

var index = 0;

var path = require('path');

var record = new Object();
var map = new Object();

var bag = new Object();
bag.index = 0;
bag.question = "";
bag.result = 0;
bag.solved = false;

var makeQuestion = function(bag)
{
	var left = Math.floor((Math.random()*100)+1);
	var right = Math.floor((Math.random()*100)+1);
	var operator;
	bag.solved = false;
	
	bag.index++;	
	
	if(left%2 == 0)//+
	{
		bag.question = left.toString() +" + "+right.toString() +" = ?";
		bag.result = left + right;	
	}
	else//-
	{
		bag.question = left.toString() +" - "+right.toString() +" = ?";
		bag.result = left - right;
	}
}

var handler = function(clientRequest, serverResponse)
{

	var filePath = path.join(__dirname, 'client.html');
	var stat = fs.statSync(filePath);
	
	clientRequest.on('data', function(){});
	clientRequest.on('end',function(){
		
		serverResponse.writeHead(200,{'Content-Type': 'text',
					      'content-Length': stat.size});
		var rs = fs.createReadStream(filePath);
		rs.on('data', function(data){
			var flushed = serverResponse.write(data);			
			});
		rs.on('end', function(){serverResponse.end();});
			
		});
}



var server = require('http').createServer(handler);

var io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket)
{
	
	socket.on('turnIn', function(data)
	{
		if(parseInt(data.index) < bag.index)
		{
			socket.emit('outDated');
		}
				
		if(parseInt(data.answer) == bag.result)
		{
			record[data.uname].score++;
			//broadcast
			socket.broadcast.emit('solved',{user:data.uname});
			socket.emit("result", {result:true, user:data.uname});
			bag.solved = true;
			makeQuestion(bag);
		}
		else
		{
			socket.emit("result", {result:false});
		}
	});

	
	socket.on('join', function(data)
		{
			if(record[data] == undefined)
			{
				socket.emit("validUser");
				record[data] = new Object();
				record[data].score = 0;
				record[data].onLine = true;
				map[data] = socket.id;
				socket.broadcast.emit('newUser', data);
			}
			else if(record[data].onLine)
			{	
				socket.emit("alreadyLogin");
				return;
			}
			else
			{
				map[data] = socket.id;
				record[data].onLine = true;
				socket.emit("validUser");
			}
			if(bag.index == 0 || bag.solved == true)
			{
				makeQuestion(bag);
			}
			socket.emit('question', {question:bag.question, index:bag.index});
			socket.emit('ulist', record);
			
		});

	socket.on('nextQuestion', function()
		{
			if(bag.solved)
			{
				makeQuestion(bag);
			}
			
			socket.emit('question', {question:bag.question, index:bag.index});
			
			
		});

	socket.on('disconnect', function()
		{
			for(var key in map)
			{
				if(map.hasOwnProperty(key))
				{
					if(socket.id == map[key])
					{
						record[key].onLine = false;
						return;
					}
				}
			}
		});
		
	socket.on('disconn', function(data)
		{
			record[data].onLine = false;

			socket.disconnect();
		});
});

server.listen(1986);


