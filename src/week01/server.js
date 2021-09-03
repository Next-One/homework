const http = require('http')

const server = http.createServer((req, res) => {
	let body = [];
	req.on('error', (err) => {
		console.error(err);
	}).on('data', (chunk) => {
		body.push(chunk);
	}).on('end', () => {
		body = Buffer.concat(body).toString();
		console.log('body',body);
		res.writeHead(200, {'Content-Type': 'text/html'})
		res.end('<meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><h1>wmx的服务器</h1>')
	});
})

server.listen('8010',() => {
	console.log('server listen on 8010')
})
