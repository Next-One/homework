const EOF = Symbol('EOF')
const css = require('css')
const layout = require('./layout')
const LetterReg = /^[a-zA-Z1-6]$/
const BlankReg = /^[\n\r\f ]$/

let currentToken = null
let currentAttribute = null
let currentTextNode = null
let stack = [{type: 'document', children: []}]
let rules = []

function splitSelector(selector) {
	let part = ''
	const partList = []
	for (const c of selector) {
		if(c === '#'){
			if(part) partList.push(part)
			part = ''
		}else if(c === '.'){
			if(part) partList.push(part)
			part = ''
		}
		part += c
	}
	if(part) partList.push(part)
	return partList
}


function specificity(selector) {
	const p = [0,0,0,0]
	const selectorParts = selector.split(' ')
	for (const part of selectorParts) {
		const partList = splitSelector(part)
		for (const partItem of partList) {
			if(partItem[0] === '#'){
				p[1]++
			}else if(partItem[0] === '.'){
				p[2]++
			}else {
				p[3]++
			}
		}
	}
	return p
}

function compare(sp1, sp2) {
	if(sp1[0] - sp2[0]){
		return sp1[0] - sp2[0]
	}
	if(sp1[1] - sp2[1]){
		return sp1[1] - sp2[1]
	}
	if(sp1[2] - sp2[2]){
		return sp1[2] - sp2[2]
	}
	return sp1[3] - sp2[3]
}

function addCssRules(text) {
	const ast = css.parse(text)
	rules.push(...ast.stylesheet.rules)
}

function match(element, selector) {
	if(!element.attributes || !selector) return false
	const partList = splitSelector(selector)
	outer: for (const part of partList) {
		const value = part.substring(1)
		if(part[0] === '#'){
			for (const attr of element.attributes) {
				if(attr.name === 'id' && attr.value === value){
					continue outer
				}
			}
		}else if(part[0] === '.'){
			for (const attr of element.attributes) {
				const classList = attr.value.split(/\s+/)
				if(attr.name === 'class' && classList.includes(value)){
					continue outer
				}
			}
		}else if(part === element.tagName){
			continue
		}
		return false
	}
	return true
}

function computedCss(element) {
	const elements = stack.slice().reverse()
	if (!element.computedStyle) element.computedStyle = {}
	for (const rule of rules) {
		let selectorParts = rule.selectors[0].split(' ').reverse()
		if (!match(element, selectorParts[0])) {
			continue
		}
		let matched = false
		let j = 1
		for (let i = 0; i < elements.length; i++) {
			if(match(elements[i], selectorParts[j])){
				j++
			}
		}
		if(j >= selectorParts.length){
			matched = true
		}
		if(matched){
			const sp = specificity(rule.selectors[0])
			const computedStyle = element.computedStyle
			for (const declaration of rule.declarations) {
				// computedStyle[declaration.property] = declaration.value
				let property = computedStyle[declaration.property]
				if(!property) property = computedStyle[declaration.property] = {}
				if(!property.specificity) {
					property.specificity = sp
					property.value = declaration.value
				}else if(compare(property.specificity, sp) < 0){
					property.specificity = sp
					property.value = declaration.value
				}
			}
			console.log(computedStyle)
		}
	}
}

function emit(token) {
	let top = stack[stack.length - 1]
	if (token.type === 'startTag') {
		let element = {
			type: 'element',
			children: [],
			attributes: []
		}
		element.tagName = token.tagName
		if (token.attributes) {
			for (const [key, value] of Object.entries(token.attributes)) {
				element.attributes.push({
					name: key,
					value
				})
			}
		}
		// ??????css
		computedCss(element)
		// ????????????
		top.children.push(element)
		element.parent = top

		if (!token.isSelfClosing) {
			stack.push(element)
		}
		currentTextNode = null
	} else if (token.type === 'endTag') {
		if (token.tagName !== top.tagName) {
			throw new Error(`Tag start ${top.tagName} end ${token.tagName} doesn't match`)
		} else {
			if (top.tagName === 'style') {
				addCssRules(top.children[0].content)
			}
			// ???????????????????????????
			layout(top)
			stack.pop()
		}
		currentTextNode = null
	} else if (token.type === 'text') {
		if (currentTextNode == null) {
			currentTextNode = {
				type: 'text',
				content: ''
			}
			top.children.push(currentTextNode)
		}
		currentTextNode.content += token.content
	}
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
	if (c === '>') {
		currentToken.isSelfClosing = true
		emit(currentToken)
		return data
	} else if (c === EOF) {
		emit({
			type: 'EOF'
		})
		return
	} else {

	}
}

function beforeAttributeName(c) {
	if (c.match(BlankReg)) {
		return beforeAttributeName
	} else if (c === '>' || c === '/' || c === EOF) {
		return data
	} else if (c === '=') {
		return beforeAttributeName
	} else if (c === '/') {
		return selfClosingStartTag
	} else {
		currentAttribute = {
			name: '',
			value: ''
		}
		return attributeName(c)
	}
}


function attributeName(c) {
	if (c.match(BlankReg) || c === '/' || c === '>' || c === EOF) {
		return afterAttributeName(c)
	} else if (c === '=') {
		return beforeAttributeValue
	} else if (c === '\u0000') {

	} else if (c === '"' || c === '\'' || c === '<') {

	} else {
		currentAttribute.name += c
		return attributeName
	}
}


function afterAttributeName(c) {
	if(c.match(BlankReg)){
		return afterAttributeName
	}else if(c === '/'){
		return selfClosingStartTag
	}else if(c === '>'){
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return data
	}else if(c === EOF){

	}else {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		currentAttribute = {
			name: '',
			value: ''
		}
		return attributeName(c)
	}
}


function beforeAttributeValue(c) {
	if (c.match(BlankReg) || c === '/' || c === '>' || c === EOF) {
		return beforeAttributeValue
	} else if (c === '"') {
		return doubleQuotedAttributeValue
	} else if (c === '\'') {
		return singleQuotedAttributeValue
	} else if (c === '>') {

	} else {
		return unquotedAttributeValue(c)
	}
}

function getCurrentAttributes() {
	if (!currentToken.attributes) {
		currentToken.attributes = {}
	}
	return currentToken.attributes
}


function doubleQuotedAttributeValue(c) {
	if (c === '"') {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	} else if (c === '\u0000') {

	} else {
		currentAttribute.value += c
		return doubleQuotedAttributeValue
	}
}


function singleQuotedAttributeValue(c) {
	if (c === '\'') {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	} else if (c === '\u0000') {

	} else {
		currentAttribute.value += c
		return singleQuotedAttributeValue
	}
}


function unquotedAttributeValue(c) {
	if (c.match(BlankReg)) {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return beforeAttributeName
	} else if (c === '/') {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		return selfClosingStartTag
	} else if (c === '>') {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	} else if (c === '\u0000') {

	} else {
		currentAttribute.value += c
		return unquotedAttributeValue
	}
}


function afterQuotedAttributeValue(c) {
	if (c.match(BlankReg)) {
		return beforeAttributeName
	} else if (c === '/') {
		return selfClosingStartTag
	} else if (c === '>') {
		const attributes = getCurrentAttributes()
		attributes[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	} else if (c === '\u0000') {

	} else {
		return beforeAttributeName(c)
	}
}


module.exports = function parserHTML(html) {
	let state = data
	for (const c of html) {
		state = state(c)
	}
	state = state(EOF)
	return stack[0]
}