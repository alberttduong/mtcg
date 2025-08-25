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
}

export function CardInfo(props: CardInfoProps) {
	const {info, name} = props

	return (<div className="w-full">
		{info && name && info.hp !== undefined && info.atk !== undefined &&
		<>
			<h1>{name}</h1>
			<h1>{info.hp}/{info.atk}</h1>
		</>
		}
	</div>)
}
