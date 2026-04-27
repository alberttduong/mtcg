import { type DeckData } from "./DeckEditor"

export default function DeckList(props: {deck?: DeckData}) {
	const {deck} = props
	return <div className="overflow-scroll w-full h-[60vh] overflow-scroll bg-gray-100 p-2">
		<h2>cards in your deck</h2>
		<hr/>
		{ deck && Object.keys(deck).map((name: string)=> {
			return <div key={name}>
				{name}{' '}
				x{deck[name]}
			</div>
		})}
	</div>
}
