type cn = string | undefined
export function clnx(...names: cn[]): string {
	let c = ""	
	for (const n of names) {
		if (n) c += n + ' '
	}
	return c
}
