import type { JSX } from "react"
import { useState, useEffect } from "react"
import { useAppDispatch } from "../../app/hooks"
import styles from "./Counter.module.css"
import { 
	connected,
	send
} from "../../app/middleware"
import { default as axios } from "axios"
import { CenterCol } from "../../styles"


interface Card {
	name: string,
	index: number,
}

interface DeckEntry {
	index: number,
	amount: number
}


export const Counter = (): JSX.Element => {
	const dispatch = useAppDispatch()
	dispatch(connected())

	const [msg, setMsg] = useState("")
	const [body, setBody] = useState("{}")
	const [cards, setCards] = useState<Card[]>([])
	const [deck, setDeck] = useState<DeckEntry[]>([])

	async function getCards() {
		axios.get('http://localhost:8080/cards')
		.then((res) => {
			let copy: Card[] = res.data 
			for (let i=0; i<copy.length; i++) {
				copy[i].index = i
			}
			console.log("copy")
			console.log(copy)
			setCards(copy)
		})
	}

	useEffect(() => {
		getCards()
	}, [])

	function sortDeck(copy: DeckEntry[]) {
		copy.sort((a, b) => {return a.index - b.index})	
		console.log(deck)
		setDeck(copy)
	}

	function removeCard(c: Card) {
		const entry = deck.find((e) => {
			return e.index === c.index
		})
		if (entry != undefined) {
			let copy = deck.filter((e) => {return e.index != c.index})
			entry.amount += 1
			copy = [...copy, entry]
			sortDeck(copy)
		} else {
			let copy = [...deck, {index: c.index, amount: 1}]
			sortDeck(copy)
		}
	}

	return (<div className={CenterCol}>
		<label>Cards</label>
		{ cards.map((c, key) => {
			return <div className="bg-gray-100 flex flex-row self-center w-md justify-between items-center" key={key}>
				<button className="sm-square" onClick={() => removeCard(c)}>
					-
				</button>
				{c.name}
				<button className="sm-square">+</button>
			</div>
		})}
		
		<label>Deck</label>
		{ deck.map((entry, key) => {
			return <div key={key}>
				{cards[entry.index].name}{' '}
				x{entry.amount}
			</div>
		})}

		<button className="">Save</button>

		<div className={styles.row}>
			<input type="text"
			value={msg}
			onChange={(e) => {
			setMsg(e.target.value)
			}
			}/>
			<input type="text"
			value={body}
			onChange={(e) => {
			setBody(e.target.value)
			}
			}/>
			<button
			className={styles.button}
			aria-label="Send"
			onClick={() => {
			const bodyObject = JSON.parse(body)
			dispatch(send({Msg: msg, Body: bodyObject}))
			}} >
			+
			</button>
		</div>
	</div>)
}
