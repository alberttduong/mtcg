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


interface Cards {
	[name: string]: {
		hp?: number	
		atk?: number
	}
}

interface Deck {
	[name: string]: number
}

export const Counter = (): JSX.Element => {
	const loggedIn = useSelector(selectLoggedIn)
	const dispatch = useAppDispatch()
	useEffect(() => {
		dispatch(connected())
		dispatch(login(undefined))
	}, [])

	const [msg, setMsg] = useState("")
	const [body, setBody] = useState("{}")
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
		<label>Cards</label>
		{ Object.keys(cards).map((name: string)=> {
			return <div className="bg-gray-100 flex flex-row self-center w-xs justify-between items-center" key={name}>
				<label className="text-center w-full">{name}</label>
				<div className="flex">
					<button className="sm-square" onClick={() => removeCard(name)}>-</button>
					<button className="sm-square" onClick={() => addCard(name)}>+</button>
				</div>
			</div>
		})}
		
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
				saveDeck()
			}}>
			Save
		</button>

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
