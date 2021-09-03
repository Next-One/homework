const net = require('net')

class ResponseParser{
	constructor() {
	}

	receive(string){
		for (let i = 0; i < string.length; i++) {
			this.receiverChar(string[i])
		}
	}

	receiverChar(char){

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

	send(connection){
		return new Promise(((resolve,reject) => {
			const parser = new ResponseParser()
			if(connection){

			}else{

			}
			resolve('')
		}))
	}
}


void async function () {
	const request = new Request({
		method: 'POST',
		host: '127.0.0.1',
		port: '8088',
		path: '/',
		headers: {
			'Content-Type': 'text/html'
		},
		body: {
			name: 'wmx'
		}
	})

	let res = await request.send()
	console.log(res, 'res')
}()