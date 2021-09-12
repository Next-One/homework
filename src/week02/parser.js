const EOF = Symbol('EOF')
const LetterReg = /^[a-zA-Z1-6]$/
const BlankReg = /^[\n\r\f ]$/

let currentToken = null
let currentAttribute = null

function emit(token) {
	if(token.type !== 'text') console.log(token)
}

function data(c) {
	if (c === '<') {
		return tagOpen
	} else if (c === EOF) {
		emit({
			type: 'EOF'
		})
		return;
	} else {
		emit({
			type: 'text',
			content: c
		})
		return data
	}
}

function tagOpen(c) {
	if (c === '/') {
		return endTagOpen
	} else if (c.match(LetterReg)) {
		currentToken = {
			type: 'startTag',
			tagName: ''
		}
		return tagName(c)
	} else {
		return
	}
}

function endTagOpen(c) {
	if (c.match(LetterReg)) {
		currentToken = {
			type: 'endTag',
			tagName: ''
		}
		return tagName(c)
	} else if (c === '>') {

	} else if (c === EOF) {
		emit({
			type: 'EOF'
		})
	} else {

	}
}


function tagName(c) {
	if (c.match(BlankReg)) {
		emit(currentToken)
		return beforeAttributeName
	} else if (c === '/') {
		return selfClosingStartTag
	} else if (c === '>') {
		emit(currentToken)
		return data
	} else if (c.match(LetterReg)) {
		currentToken.tagName += c
		return tagName
	} else {
		return tagName
	}
}

function selfClosingStartTag(c) {
	if (c === '>'){
		currentToken.isSelfClosing = true
		emit(currentToken)
		return data
	}else if(c === EOF){
		emit({
			type: 'EOF'
		})
		return
	}else {

	}
}

function beforeAttributeName(c) {
	if(c.match(BlankReg)){
		return beforeAttributeName
	}else if(c === '>' || c === '/' || c === EOF){
		return data
	}else if(c === '='){
		return beforeAttributeName
	}else if(c === '/'){
		return selfClosingStartTag
	}else {
		currentAttribute = {
			name: '',
			value: ''
		}
		return attributeName(c)
	}
}


function attributeName(c) {
	if(c.match(BlankReg) || c === '/' || c === '>' || c === EOF){
		return afterAttributeName(c)
	}else if(c === '='){
		return beforeAttributeValue
	}else if(c === '\u0000'){

	}else if(c === '"' || c === '\'' || c === '<'){

	}else {
		currentAttribute.name+=c
		return attributeName
	}
}


function afterAttributeName(c) {

}



function beforeAttributeValue(c) {
	if(c.match(BlankReg) || c === '/' || c === '>' || c === EOF){
		return beforeAttributeValue
	}else if(c === '"'){
		return doubleQuotedAttributeValue
	}else if(c === '\''){
		return singleQuotedAttributeValue
	}else if(c === '>'){

	}else {
		return unquotedAttributeValue(c)
	}
}

function getCurrentAttributes() {
	if(!currentToken.attributes){
		currentToken.attributes = {}
	}
	return currentToken.attributes
}


function doubleQuotedAttributeValue(c) {
	if(c === '"'){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	}else if(c === '\u0000'){

	}else {
		currentAttribute.value += c
		return doubleQuotedAttributeValue
	}
}



function singleQuotedAttributeValue(c) {
	if(c === '\''){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	}else if(c === '\u0000'){

	}else {
		currentAttribute.value += c
		return singleQuotedAttributeValue
	}
}


function unquotedAttributeValue(c) {
	if(c.match(BlankReg)){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return beforeAttributeName
	}else if(c === '/'){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return selfClosingStartTag
	}else if(c === '>'){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	}else if(c === '\u0000'){

	}else {
		currentAttribute.value += c
		return unquotedAttributeValue
	}
}


function afterQuotedAttributeValue(c) {
	if(c.match(BlankReg)){
		return beforeAttributeName
	}else if(c === '/'){
		return selfClosingStartTag
	}else if(c === '>'){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	}else if(c === '\u0000'){

	}else {
		return beforeAttributeName(c)
	}
}


function afterAttributeValue(c) {

}


module.exports = function parserHTML(html) {
	console.log(html,'html')
	let state = data
	for (const c of html) {
		state = state(c)
	}
	state = state(EOF)
}