const http = require('http')

const server = http.createServer((req, res) => {
	let body = [];
	req.on('error', (err) => {
		console.error(err);
	}).on('data', (chunk) => {
		body.push(chunk);
	}).on('end', () => {
		body = Buffer.concat(body).toString();
		res.writeHead(200, {'Content-Type': 'text/html'})
		res.end('<h1>汪明喜的server</h1>')
	});
})

server.listen('8010',() => {
	console.log('server listen on 8010')
})
