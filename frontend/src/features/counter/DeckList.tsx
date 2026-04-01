import { Deck } from "./Counter"

export default function DeckList(props: {deck: Deck}) {
	const {deck} = props
	return <div className="overflow-scroll w-full h-[60vh] bg-gray-100">
		{ Object.keys(deck).map((name: string)=> {
			return <div key={name}>
				{name}{' '}
				x{deck[name]}
			</div>
		})}
	</div>
}

