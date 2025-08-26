import type { JSX } from "react"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { 
	useAppDispatch, 
	login,
	logout,	
	selectLoggedIn,
} from "../../app/store"
import styles from "./Counter.module.css"
import { 
	connected,
	send,
} from "../../app/middleware"
import { default as axios } from "axios"
import { CenterCol } from "../../styles"
import { Popup,
	usePopup,
} from "@/features/component/popup"

export interface CardInfo {
	hp?: number	
	atk?: number
}

export interface Cards {
	[name: string]: CardInfo
}

interface Deck {
	[name: string]: number
}

export const Counter = (): JSX.Element => {
	const loggedIn = useSelector(selectLoggedIn)
	const dispatch = useAppDispatch()
	useEffect(() => {
		dispatch(login(undefined))
	}, [])

	const [newPopup, closePopup, popupText] = usePopup()

	const [cards, setCards] = useState<Cards>({})
	const [deck, setDeck] = useState<Deck>({})

	async function getCards() {
		axios.get('http://localhost:8080/cards')
		.then((res) => {
			setCards(res.data)
		})
		axios.get('http://localhost:8080/deck')
		.then((res) => {
			setDeck(res.data)
		})
	}

	async function saveDeck() {
		axios.put('http://localhost:8080/deck', deck)
		.then((res) => {
			console.log(res)
		})
	}

	useEffect(() => {
		getCards()
	}, [])

	function removeCard(name: string) {
		if (name in cards && name in deck) {
			if (deck[name] == 1) {
				const copy = deck
				delete copy[name]
				setDeck({...copy})
			} else {
				setDeck({
					...deck,
					[name]: deck[name] - 1
				})
			}
		}
	}

	function addCard(name: string) {
		if (name in cards) {
			setDeck({
				...deck,
				[name]: name in deck? deck[name]+1 : 1
			})
		}
	}

	return (<div className={CenterCol}>
		{"Logged in: "}{loggedIn ? "true" : "false"}
		<Popup closePopup={closePopup} text={popupText}/>
		<label>Cards</label>
		<div className="overflow-scroll h-[60vh]">
		{ Object.keys(cards).map((name: string)=> {
			return <div className="bg-gray-100 flex flex-row self-center w-xs justify-between items-center" key={name}>
				<label className="text-center w-full">{name}</label>
				<div className="flex">
					<button className="sm-square" onClick={() => removeCard(name)}>-</button>
					<button className="sm-square" onClick={() => addCard(name)}>+</button>
				</div>
			</div>
		})}
		</div>
		
		<button className="sm-square" onClick={ () => {
				dispatch(login({username: 'Bill'}))
			}
		}>Login</button>
		<button className="sm-square" onClick={ () => {
				dispatch(logout())
			}
		}>Logout</button>
		
		<label>Deck</label>
		{ Object.keys(deck).map((name: string)=> {
			return <div key={name}>
				{name}{' '}
				x{deck[name]}
			</div>
		})}

		<button className="" onClick={() => {
			newPopup("hi")
			localStorage.setItem('deck', JSON.stringify(deck))
		}}>
			Save Locally
		</button>

		<button className="" onClick={() => {
				saveDeck()
			}}>
			Save
		</button>
	</div>)
}
