function isUseDefault(value) {
	return !value || value === 'auto'
}

function getStyle(element) {
	if (!element.style) element.style = {}
	for (const [key, value] of Object.entries(element.computedStyle)) {
		let p = value.value
		if (p.includes('px') || p.match(/^[0-9\.]+$/)) {
			p = parseInt(p)
		}
		element.style[key] = p
	}
	return element.style
}

function layout(element) {
	if (!element.computedStyle) {
		return
	}
	const elementStyle = getStyle(element)
	if (elementStyle.display !== 'flex') return;
	const items = element.children.filter(e => e.type === 'element')
	items.sort((a, b) => (a.order || 0) - (b.order || 0))
	const style = elementStyle;
	['height', 'width'].forEach(size => {
		if (isUseDefault(style[size])) {
			style[size] = null
		}
	})
	if (isUseDefault(style.flexDirection)) style.flexDirection = 'row'
	if (isUseDefault(style.alignItems)) style.alignItems = 'stretch'
	if (isUseDefault(style.justifyContent)) style.justifyContent = 'flex-start' // 右对齐
	if (isUseDefault(style.flexWrap)) style.flexWrap = 'nowrap'
	if (isUseDefault(style.alignContent)) style.alignContent = 'stretch'
	let mainSize, mainStart, mainEnd, mainSign, mainBase,
		crossSize, crossStart, crossEnd, crossSign, crossBase;
	if (style.flexDirection === 'row') {
		mainSize = 'width'
		mainStart = 'left'
		mainEnd = 'right'
		mainSign = +1
		mainBase = 0

		crossSize = 'height'
		crossStart = 'top'
		crossEnd = 'bottom'
	} else if (style.flexDirection === 'row-reverse') {
		mainSize = 'width'
		mainStart = 'right'
		mainEnd = 'left'
		mainSign = -1
		mainBase = style.width

		crossSize = 'height'
		crossStart = 'top'
		crossEnd = 'bottom'
	} else if (style.flexDirection === 'column') {
		mainSize = 'height'
		mainStart = 'bottom'
		mainEnd = 'top'
		mainSign = +1
		mainBase = 0

		crossSize = 'width'
		crossStart = 'left'
		crossEnd = 'right'
	} else if (style.flexDirection === 'column-reverse') {
		mainSize = 'height'
		mainStart = 'top'
		mainEnd = 'bottom'
		mainSign = -1
		mainBase = style.height

		crossSize = 'width'
		crossStart = 'left'
		crossEnd = 'right'
	}

	if (style.flexWrap === 'wrap-reverse') {
		[crossStart, crossEnd] = [crossEnd, crossStart]
		crossSign = -1
	} else {
		crossBase = 0
		crossSign = 1
	}
	let isAutoMainSize = false
	if (!style[mainSize]) {
		elementStyle[mainSize] = 0
		for (const item of items) {
			let itemStyle = getStyle(item)
			if (itemStyle != null) {
				elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize]
			}
		}
		isAutoMainSize = true
	}
	let flexLine = []
	let flexLines = [flexLine]
	let mainSpace = elementStyle[mainSize]
	let crossSpace = 0
	for (const item of items) {
		let itemStyle = getStyle(item)
		if (itemStyle[mainSize] == null) {
			itemStyle[mainSize] = 0
		}
		if (itemStyle.flex) {
			flexLine.push(item)
		} else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
			mainSpace -= itemStyle[mainSize]
			if (itemStyle[crossSize] != null) {
				crossSpace = Math.max(crossSpace, itemStyle[crossSize])
			}
			flexLine.push(item)
		} else {
			if (itemStyle[mainSize] > elementStyle[mainSize]) {
				elementStyle[mainSize] = itemStyle[mainSize]
			}
			if (mainSpace < itemStyle[mainSize]) {
				flexLine.mainSpace = mainSpace
				flexLine.crossSpace = crossSpace
				flexLine = [item]
				flexLines.push(flexLines)
				mainSize = style[mainSize]
				crossSpace = 0
			} else {
				flexLine.push(item)
			}
			if (itemStyle[crossSize] != null) {
				crossSpace = Math.max(crossSpace, itemStyle[crossSize])
			}
			mainSpace -= itemStyle[mainSize]
		}
	}
	flexLine.mainSpace = mainSpace
	if (style.flexWrap === 'nowrap' || isAutoMainSize) {
		flexLine.crossSpace = style[crossSize] ? style[crossSize] : crossSpace
	} else {
		flexLine.crossSpace = crossSpace
	}
	if (mainSpace < 0) {
		let scale = style[mainSize] / (style[mainSize] - mainSpace)
		let currentMain = mainBase
		for (const item of items) {
			const itemStyle = getStyle(item)
			if (itemStyle.flex) itemStyle[mainSize] = 0
			itemStyle[mainSize] = itemStyle[mainSize] * scale
			itemStyle[mainStart] = currentMain
			itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
			currentMain = itemStyle[mainEnd]
		}
	} else {
		flexLines.forEach(items => {
			let mainSpace = items.mainSpace
			let flexTotal = 0
			for (const item of items) {
				const itemStyle = getStyle(item)
				if (itemStyle.flex != null) {
					flexTotal += itemStyle.flex
				}
			}

			if (flexTotal > 0) {
				let currentMain = mainBase
				for (const item of items) {
					const itemStyle = getStyle(item)
					if (itemStyle.flex) {
						itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex
					}
					itemStyle[mainStart] = currentMain
					itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
					currentMain = itemStyle[mainEnd]
				}
			} else {
				let currentMain, step = 0
				switch (style.justifyContent) {
					case 'flex-start': {
						currentMain = mainBase
						break;
					}
					case 'flex-end': {
						currentMain = mainSpace * mainSign + mainBase
						break;
					}
					case 'center': {
						currentMain = mainSpace / 2 * mainSign + mainBase
						break;
					}
					case 'space-between': {
						step = mainSpace / (items.length - 1) * mainSign
						currentMain = mainBase
						break;
					}
					case 'space-around': {
						step = mainSpace / items.length * mainSign
						currentMain = step / 2 + mainBase
						break;
					}
				}
				for (const item of items) {
					const itemStyle = getStyle(item)
					itemStyle[mainStart] = currentMain
					itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
					currentMain = itemStyle[mainEnd] + step
				}
			}
		})
	}
	if (!style[crossSize]) {
		crossSpace = 0
		elementStyle[crossSize] = 0
		for (const flexLine of flexLines) {
			elementStyle[crossSize] = elementStyle[crossSize] + flexLine.crossSpace
		}
	} else {
		crossSpace = style[crossSize]
		for (const flexLine of flexLines) {
			crossSpace -= flexLine.crossSpace
		}
	}
	if (style.flexWrap === 'wrap-reverse') {
		crossBase = style[crossSize]
	} else {
		crossBase = 0
	}
	let lineSize = style[crossSize] / flexLines.length
	let step = 0
	switch (style.alignContent) {
		case 'flex-start': {
			crossBase += 0
			break;
		}
		case 'flex-end': {
			crossBase += crossSpace * crossSign
			break;
		}
		case 'center': {
			crossBase += crossSpace / 2 * crossSign
			break;
		}
		case 'space-between': {
			step = crossSpace / (items.length - 1) * crossSign
			crossBase += 0
			break;
		}
		case 'space-around': {
			step = crossSpace / items.length
			crossBase += step / 2 * crossSign
			break;
		}
		case 'stretch': {
			crossBase += 0
			break;
		}
	}
	flexLines.forEach(items => {
		let lineCrossSize = style.alignContent === 'stretch' ?
			items.crossSpace + crossSpace / flexLines.length :
			items.crossSpace
		for (const item of items) {
			const itemStyle = getStyle(item)
			let align = item.alignSelf || item.alignItems
			if (!itemStyle[crossSize]) itemStyle[crossSize] = align === 'stretch' ? lineCrossSize : 0
			if (align === 'flex-start') {
				itemStyle[crossStart] = crossBase
				itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
			}
			if (align === 'flex-end') {
				itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
				itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
			}
			if (align === 'center') {
				itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2
				itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
			}
			if (align === 'stretch') {
				itemStyle[crossStart] = crossBase
				itemStyle[crossEnd] = crossBase + crossSign * (itemStyle[crossSize] != null ? itemStyle[crossSize] : lineCrossSize)
				itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
			}

		}
		crossBase = crossSign * (lineCrossSize + step)
	})
	
}


module.exports = layout
