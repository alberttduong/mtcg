export interface CardInfo {
	hp?: number	
	atk?: number
	cost?: number
}

interface CardInfoProps {
	info: CardInfo
	name: string
	className?: string
}

export function CardInfo(props: CardInfoProps) {
	const {info, name, className} = props

	return (<div className={className}>
		{info && <>
			<p>{name}</p>
			<p>HP: {info.hp || 0}</p>
			<p>ATK: {info.atk || 0}</p>
			{info.cost && <p>Cost: {info.cost}</p>}
		</>
		}
	</div>)
}
