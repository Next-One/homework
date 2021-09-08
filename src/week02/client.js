const net = require('net')
const parser = require('./parser')

class TrunkedBodyParser {
	constructor() {
		this.WAITING_LENGTH = 0
		this.WAITING_LENGTH_LINE_END = 1
		this.READING_THUNK = 2
		this.WAITING_NEW_LINE = 3
		this.WAITING_NEW_LINE_END = 4
		this.length = 0
		this.content = []
		this.isFinished = false
		this.current = this.WAITING_LENGTH
	}

	receiverChar(char){
		if (this.current === this.WAITING_LENGTH){
			if (char === '\r'){
				if (this.length === 0){
					this.isFinished = true
				}
				this.current = this.WAITING_LENGTH_LINE_END
			} else {
				this.length *= 16
				this.length += parseInt(char, 16)
			}
		}else if (this.current === this.WAITING_LENGTH_LINE_END){
			if (char === '\n'){
				if (this.length > 0){
					this.current = this.READING_THUNK
				}
			}
		}else if (this.current === this.READING_THUNK){
			this.content.push(char)
			// 仅针对utf8的处理
			let len = 1
			const code = char.charCodeAt(0)
			if (code >= 0x0080 && code <= 0x07ff) {
				len = 2
			} else if (code >= 0x0800 && code <= 0xffff) {
				len = 3
			}
			this.length -= len
			if (this.length === 0){
				this.current = this.WAITING_NEW_LINE
			}
		}else if (this.current === this.WAITING_NEW_LINE){
			if (char === '\r'){
				this.current = this.WAITING_NEW_LINE_END
			}
		}else if (this.current === this.WAITING_NEW_LINE_END){
			if (char === '\n'){
				this.current = this.WAITING_LENGTH
			}
		}
	}
}

class ResponseParser{
	constructor() {
		this.WAITING_STATUS_LINE = 0
		this.WAITING_STATUS_LINE_END = 1
		this.WAITING_HEADER_NAME = 2
		this.WAITING_HEADER_SPACE = 3
		this.WAITING_HEADER_VALUE = 4
		this.WAITING_HEADER_LINE_END = 5
		this.WAITING_HEADER_BLOCK_END = 6
		this.WAITING_BODY = 7

		this.current = this.WAITING_STATUS_LINE
		this.statusLine = ''
		this.headers = {}
		this.headerName = ''
		this.headerValue = ''
		this.bodyParser = null
	}

	get isFinished(){
		return this.bodyParser && this.bodyParser.isFinished
	}

	get response(){
		this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
		const body = this.bodyParser ? this.bodyParser.content.join('').toString() : ''
		return {
			statusCode: RegExp.$1,
			statusText: RegExp.$2,
			headers: this.headers,
			body
		}
	}

	receive(string){
		for (let i = 0; i < string.length; i++) {
			const char = string.charAt(i)
			this.receiverChar(char)
		}
	}

	receiverChar(char){
		if (this.current === this.WAITING_STATUS_LINE){
			if(char === '\r'){
				this.current = this.WAITING_STATUS_LINE_END
			}else{
				this.statusLine += char
			}
		}else if (this.current === this.WAITING_STATUS_LINE_END){
			if (char === '\n'){
				this.current = this.WAITING_HEADER_NAME
			}
		}else if (this.current === this.WAITING_HEADER_NAME){
			if (char === ':'){
				this.current = this.WAITING_HEADER_SPACE
			}else{
				this.headerName += char
			}
		}else if (this.current === this.WAITING_HEADER_SPACE){
			if (char === ' '){
				this.current = this.WAITING_HEADER_VALUE
			}
		}else if (this.current === this.WAITING_HEADER_VALUE){
			if (char === '\r'){
				this.current = this.WAITING_HEADER_LINE_END
				this.headers[this.headerName] = this.headerValue
				this.headerName = ''
				this.headerValue = ''
			}else {
				this.headerValue += char
			}
		}else if (this.current === this.WAITING_HEADER_LINE_END){
			if (char === '\r'){
				this.current = this.WAITING_HEADER_BLOCK_END
				if (this.headers['Transfer-Encoding'] === 'chunked'){
					this.bodyParser = new TrunkedBodyParser()
				}
			}else if (char === '\n'){

			}else {
				this.current = this.WAITING_HEADER_NAME
				this.headerName += char
			}
		}else if (this.current === this.WAITING_HEADER_BLOCK_END){
			if (char === '\n'){
				this.current = this.WAITING_BODY
			}
		}else if (this.current === this.WAITING_BODY){
			this.bodyParser.receiverChar(char)
		}
	}
}

class Request{
	constructor(options) {
		this.method = options.method || 'GET'
		this.host = options.host
		this.path = options.path || '/'
		this.port = options.port
		this.headers = options.headers || {}
		this.body = options.body || {}
		this.bodyText = ''
		if(!this.headers['Content-Type']) {
			this.headers['Content-Type'] = 'application/x-www-form-urlencode'
		}
		if(this.headers['Content-Type'] === 'application/json'){
			this.bodyText = JSON.stringify(this.body)
		}else if(this.headers['Content-Type'] === 'application/x-www-form-urlencode'){
			this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
		}
		this.headers['Content-Length'] = this.bodyText.length
	}

	toString(){
		const CRLF = '\r\n'
		const request = [
			`${this.method} ${this.path} HTTP/1.1`,
			CRLF,
			Object.entries(this.headers).map(([key,value]) => `${key}: ${value}`).join(CRLF),
			CRLF,
			CRLF,
			this.bodyText
		]
		return request.join('')
	}

	send(connection){
		return new Promise(((resolve,reject) => {
			const responseParser = new ResponseParser()
			if(connection){
				connection.write(this.toString())
			}else{
				connection = net.createConnection({
					host: this.host,
					port: this.port
				},() => {
					connection.write(this.toString())
				})
			}
			connection.on('data',(data)=>{
				const response = data.toString()
				responseParser.receive(response)
				if(responseParser.isFinished){
					resolve(responseParser.response)
					connection.end()
				}
			})
			connection.on('error',(e)=>{
				reject(e)
				connection.end()
			})
		}))
	}
}


void async function () {
	const request = new Request({
		method: 'POST',
		host: '127.0.0.1',
		port: '8010',
		path: '/',
		headers: {
			'Content-Type': 'application/x-www-form-urlencode'
		},
		body: {
			name: 'wmx'
		}
	})

	const response = await request.send()
	parser(response.body)
}()