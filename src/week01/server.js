const http = require('http')

const server = http.createServer((req, res) => {
	let body = [];
	req.on('error', (err) => {
		console.error(err);
	}).on('data', (chunk) => {
		console.log('data', chunk.toString())
		body.push(chunk);
	}).on('end', () => {
		body = Buffer.concat(body).toString();
		console.log('body',body);
		res.writeHead(200, {'Content-Type': 'text/html'})
		res.end('hello world\r')
	});
})

server.listen('8010',() => {
	console.log('server listen on 8010')
})
