const http = require('http')
const {open} = require('fs/promises')

let htmlData = null



async function getIndexHtmlData(file = './src/week02/index.html') {
	// if(htmlData) return htmlData 不缓存index数据，每次拿最新的
	let fileHandler
	try{
		fileHandler = await open(file, 'r')
		const data = await fileHandler.read()
		return htmlData = data.buffer
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
	console.log('server listen on 8010')
})
