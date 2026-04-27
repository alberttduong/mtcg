import { RadioGroup, Radio, Label } from "@headlessui/react"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { selectLoggedIn, selectConfirmedDeck } from "../../app/store"
import DeckList from "./DeckList"
import { type DeckData } from "./DeckEditor"
import axios from "axios"
import { type Dispatch, type SetStateAction } from "react"
import { 
	type SendMsg,
	API_URL
} from "@/app/middleware"

export type DeckOption = {
	name?: string
	auth?: boolean
	data: DeckData
}

export function DeckSelectionMenu(props: {
	deck: DeckOption, 
	setDeck: Dispatch<SetStateAction<DeckOption>>
	sendMsg: SendMsg
}) {
	const {deck, setDeck, sendMsg} = props

	const [localDeck, _] = useState<DeckOption>({
		name: "local", 
		data: JSON.parse(localStorage.getItem("deck") || "{}")
	})

	const [deck1, setDeck1] = useState<DeckOption>({
		name: "deck1",
		auth: true,
		data: {},
	})

	const deckOptions: DeckOption[] = [
		localDeck,
		deck1,
	]

	const confirmedDeck = useSelector(selectConfirmedDeck)

	useEffect(() => {
		axios.get(`${API_URL}/deck`, {
			headers: {
				'Authorization': localStorage.getItem('token')
			},
		})
		.then((res) => {
			setDeck1({...deck1, data: res.data})
		})
	}, [])

	const loggedIn = useSelector(selectLoggedIn)
	
	return <div className="bg-blue-100 flex">
		<div>
			<div>
				{ confirmedDeck ? confirmedDeck : "Choose your deck" }
			</div>
			<RadioGroup value={deck} onChange={setDeck}>
				{deckOptions.filter((d) => {
					return loggedIn == true || !d.auth
				}).map((d, k) => {
					return <div key={k} className="flex">
						<Radio value={d} 
						className="group flex size-5 items-center justify-center rounded-full border bg-white data-checked:bg-blue-400"
						>
							<span className="invisible size-2 rounded-full bg-white group-data-checked:visible" />
						</Radio>
						<Label>{d.name || ""}</Label>
					</div>
				})}
			</RadioGroup>

			{!loggedIn && <div>
				Login to save 2 more decks
			</div>}

			<button
				onClick={() => {
					sendMsg("set deck", {"deck": deck.data, "name": deck.name})
				}}>
				Confirm
			</button>
		</div>

		<div>
			<DeckList deck={deck.data}/>
		</div>
	</div>
}
