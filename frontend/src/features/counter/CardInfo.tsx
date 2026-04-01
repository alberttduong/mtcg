import {
	type Card,
} from "@/features/game/Game"

import {
	type Cards,
	type CardInfo
} from "@/features/counter/Counter"

interface CardInfoProps {
	info: CardInfo
	name: string
	className?: string
}

export function CardInfo(props: CardInfoProps) {
	const {info, name, className} = props

	return (<div className={className}>
		{info && name && info.hp !== undefined && info.atk !== undefined &&
		<>
			<h1>{name}</h1>
			<h1>{info.hp}/{info.atk}</h1>
			<h1>{info.cost}</h1>
		</>
		}
	</div>)
}
