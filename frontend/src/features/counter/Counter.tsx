import type { JSX } from "react"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { 
	useAppDispatch, 
	logout,	
	selectLoggedIn,
} from "../../app/store"
import { 
	connected,
	send,
} from "../../app/middleware"
import { default as axios } from "axios"
import { CenterCol, CenterRow } from "../../styles"
import { Popup,
	usePopup,
} from "@/features/component/popup"
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

import { CardInfo as CardInfoView } from "./CardInfo"
import DeckList from "./DeckList"

export interface CardInfo {
	hp?: number	
	atk?: number
	cost?: number
}

export interface Cards {
	[name: string]: CardInfo
}

export interface Deck {
	[name: string]: number
}

type deckOption = "local" | "deck1" | "deck2" | "loading"

function SelectDeck(props: {
	saved: boolean, 
	error: (msg: string) => void
	select: (deck: deckOption) => void
	loggedIn?: boolean,
}) {
	const { saved, error, select, loggedIn } = props

	const selectOption = (d: deckOption) => {
		if (!saved) {
			error("You have unsaved changes!")
			return
		}
		select(d)
	}

  return (
    <Menu>
      <MenuButton>Select Deck</MenuButton>
      <MenuItems anchor="right start" className="bg-white p-5">
        <MenuItem>
			<button onClick={()=>selectOption("local")}>
				Local Deck
			</button>
        </MenuItem>
		{loggedIn && <>
        <MenuItem>
			<button onClick={()=>selectOption("deck1")}>
		  	Deck 1
			</button>
        </MenuItem>
        <MenuItem>
			<button onClick={()=>selectOption("deck2")}>
		  	Deck 2
			</button>
        </MenuItem>
		</>}
      </MenuItems>
    </Menu>
  )
}

export const Counter = (): JSX.Element => {
	const loggedIn = useSelector(selectLoggedIn)

	const [newPopup, closePopup, popupText] = usePopup()

	const [cardHovered, setCardHovered] = useState("")

	const [cards, setCards] = useState<Cards>({})
	const [ogDeck, setOGDeck] = useState<Deck>({})
	const [deck, setDeck] = useState<Deck>({})

	const [deckName, setDeckName] = useState<deckOption>("loading")
	const [saved, setSaved] = useState(true)

	async function getDeck() {
		axios.get('http://localhost:8080/deck', {
			headers: {
				 Authorization: localStorage.getItem('token'),
			}
		})
		.then((res) => {
			if (res.status == 200) {
				setOGDeck(res.data)
				setDeck(res.data)
				setDeckName("deck1")
			} else {
				//todo
			}
		})
	}

	async function testCxn() {
		axios.get('http://localhost:8080/testcxn')
		.then((res) => {
			if (res.status == 200) {
				newPopup("200")
			} else {
				newPopup(`Cxn Err ${res.status} ${res.statusText}`)
			}
		})
	}

	async function saveDeck() {
		axios.put('http://localhost:8080/deck', deck, {
			headers: {
				 Authorization: localStorage.getItem('token'),
			}
		})
		.then((res) => {
			if (res.status == 200) {
				setSaved(true)
				newPopup("Deck successfully saved")
			} else {
				newPopup(`Couldn't save deck: Err ${res.status} ${res.statusText}`)
			}
		})
	}

	useEffect(() => {
		axios.get('http://localhost:8080/cards')
		.then((res) => {
			setCards(res.data)
		})
		getDeck()
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
			setSaved(false)
		}
	}

	function addCard(name: string) {
		if (name in cards) {
			setDeck({
				...deck,
				[name]: name in deck? deck[name]+1 : 1
			})
			setSaved(false)
		}
	}

	return (<div className={CenterRow + " h-[100vh]"}>
		<CardInfoView 
			className="fixed top-10 left-10 bg-gray-100 p-4 w-[100px] h-[150px]"
			info={cards[cardHovered]} name={cardHovered}/>
		<div className="flex flex-col items-start h-full w-[25%]">
			<Popup closePopup={closePopup} text={popupText}/>
			<label>Cards</label>
			<div className="overflow-scroll bg-gray-100 w-full h-[60vh] p-2">
			{ Object.keys(cards).map((name: string)=> {
				return <div 
					className="w-full flex flex-row self-center justify-between items-center" 
					onMouseEnter={() => setCardHovered(name)}
					key={name}>
					<label className="text-center">{name}</label>
					<div className="flex">
						<button className="sm-square" onClick={() => removeCard(name)}>-</button>
						<button className="sm-square" onClick={() => addCard(name)}>+</button>
					</div>
				</div>
			})}
			</div>
		</div>
		<div className="flex flex-col items-start h-full w-[25%]">
			<h1>Editing {deckName} (Username) </h1>
			{!saved && "(Changes not saved)"}
			<SelectDeck 
				saved={saved} 
				error={newPopup}
				loggedIn={loggedIn}
				select={(opt: deckOption) => {
					setDeckName("loading")
					setOGDeck({})
					setDeck({})
					switch (opt) {
					case "local":
						const d = localStorage.getItem('deck')
						const deckParsed: Deck = 
							d ? JSON.parse(d) : {}
						setOGDeck(deckParsed)
						setDeck(deckParsed)
						break
					case "deck1":
						getDeck()
						break
					default:
						newPopup("deck2 option coming soon..")
						return
					}
					setDeckName(opt)
				}}
				/>

			<DeckList deck={deck}/>
			{"Logged in: "}{loggedIn ? "true" : "false"}

			{deckName == "local" &&
			<button className="" onClick={() => {
				localStorage.setItem('deck', JSON.stringify(deck))
				setSaved(true)
			}}>
				Save Locally
			</button>}

			<button className="" onClick={() => {
				testCxn()
			}}>
				Test
			</button>

			{deckName != "local" &&
			<button className="" onClick={() => {
				saveDeck()
			}}>
				Save
			</button>}

			<button className="" onClick={() => {
				setDeck(ogDeck)
				setSaved(true)
			}}>
				Reset
			</button>
		</div>
	</div>)
}
