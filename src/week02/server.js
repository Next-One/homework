const http = require('http')
const {open} = require('fs/promises')


async function getIndexHtmlData(file = './src/week02/index.html') {
	let fileHandler
	try{
		fileHandler = await open(file, 'r')
		const {buffer,bytesRead} = await fileHandler.read()
		return buffer.slice(0, bytesRead)
	}finally {
		if(fileHandler) await fileHandler.close()
	}
}

const server = http.createServer((req, res) => {
	let body = [];
	req.on('error', (err) => {
		console.error(err);
	}).on('data', (chunk) => {
		body.push(chunk);
	}).on('end', async () => {
		body = Buffer.concat(body).toString();
		res.writeHead(200, {'Content-Type': 'text/html'})
		const buffer = await getIndexHtmlData()
		res.end(buffer)
	});
})

server.listen('8010',() => {
	console.log('server listen on 8010, 请注意，该代码运行环境必须是node15以上！！！')
})
