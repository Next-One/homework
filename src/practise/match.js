function match1(input) {
	for (const s of input) {
		if(s === 'a') return true
	}
	return false
}

function match2(input) {
	for (let i = 0; i < input.length - 1; i++) {
		if(input[i] === 'a' && input[i+1] === 'b') return true
	}
	return false
}


function match3(input) {
	for (let i = 0; i < input.length - 5; i++) {
		if(input[i] === 'a'
			&& input[i+1] === 'b'
			&& input[i+2] === 'c'
			&& input[i+3] === 'd'
			&& input[i+4] === 'e'
			&& input[i+5] === 'f') return true
	}
	return false
}

{

// reconsume
	const start = c => c === 'A' ? foundA : start
	const foundA = c => c === 'B' ? foundB : start(c)
	const foundB = c => c === 'C' ? foundC : start(c)
	const foundC = c => c === 'D' ? foundD : start(c)
	const foundD = c => c === 'E' ? foundE : start(c)
	const foundE = c => c === 'F' ? end : start(c)
	const end = c => end

	function match4(input) {
		let s = start
		for (const c of input) {
			s = s(c)
			// debugger
			if(s === end) return true
		}
		return false
	}


	console.log(match4('SABCDEFAG'))

}

{

// reconsume
	const start = c => c === 'A' ? foundA : start
	const foundA = c => c === 'B' ? foundB : start(c)
	const foundB = c => c === 'C' ? foundA2 : start(c)
	const foundA2 = c => c === 'A' ? foundB2 : start(c)
	const foundB2 = c => c === 'B' ? foundX : start(c)
	const foundX = c => c === 'X' ? end : foundB(c)
	const end = c => end

	function match5(input) {
		let s = start
		for (const c of input) {
			s = s(c)
			if(s === end) return true
		}
		return false
	}


	console.log(match5('SABCABCABX'))
}


{

// reconsume
	const start = c => c === 'a' ? foundA : start
	const foundA = c => c === 'b' ? foundB : start(c)
	const foundB = c => c === 'a' ? foundA2 : start(c)
	const foundA2 = c => c === 'b' ? foundB2 : start(c)
	const foundB2 = c => c === 'a' ? foundA3 : start(c)
	const foundA3 = c => c === 'b' ? foundB3 : start(c)
	const foundB3 = c => c === 'x' ? end : foundB2(c)
	const end = c => end

	function match6(input) {
		let s = start
		for (const c of input) {
			s = s(c)
			if(s === end) return true
		}
		return false
	}


	console.log(match6('tababababx'))
}




{

	function getNext(p) {
		const next = [-1]
		let i=0,j=-1
		while(i < p.length){
			if(j === -1 || p[i] === p[j]){
				i++
				j++
				next[i] = j
			}else{
				j = next[j]
			}
		}
		return next
	}
	/*
对于未知pattern的字符串匹配而言，要用状态机实现。主要分为三步：
1.获取pattern串的next数组，用于确定状态机各种状态之间的跳转，（参考KMP算法）
2.生成pattern串对应的状态机，这一步主要使用next数据在符合跳转状态之后，该跳转到下一个状态（根据pattern串，生成状态列表）
3.用以获取的statusList状态机的状态列表，对主串s进行匹配，结束end态标识匹配成功（用statusList匹配主串）
	* */

	function match(s1, p1) {
		if(s1.length < p1.length) return false
		const end = c => end
		// 获取跳转的next
		const next = getNext(p1)
		const statusList = []
		for (let i = 0; i < p1.length; i++) {
			statusList.push((c) => {
				//  表示该状态匹配成功，进入下一个状态
				if(c === p1[i]){
					return statusList[i+1]
				//	初始状态
				}else if(i === 0){
					return statusList[0]
				//	结束状态
				}else if(i === p1.length - 1){
					return end
				//	匹配失败之后的跳转状态，需要知道是第几步失败，进而确定跳转的状态
				} else {
					let n = next[i]
					return statusList[n](c)
				}
			})
		}
		let s = statusList[0]
		for (const c of s1) {
			s = s(c)
			if(s === end) return true
		}
		return false
	}


	const s1 = 'tababababx'
	const p1 = 'abababx'
	console.log(match(s1, p1))



	console.log(getNext('ababababc'))
}



