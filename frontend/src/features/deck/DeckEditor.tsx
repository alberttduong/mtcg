import type { JSX } from "react"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { API_URL } from "../../app/middleware"
import { selectLoggedIn, } from "../../app/store"
import { default as axios } from "axios"
import { Popup, usePopup, } from "@/features/component/popup"
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { CardInfo as CardInfoView, type CardInfo, } from "./CardInfo"
import DeckList from "./DeckList"
import { HomeWrapper } from "@/features/home/HomeWrapper"
import { DoubleMenu } from "@/features/home/Home"

export interface Cards {
	[name: string]: CardInfo
}

export interface DeckData {
	[name: string]: number
}

export type deckOption = "local" | "deck1" | "loading"

export function SelectDeck(props: {
	selectOption: (deck: deckOption) => void
}) {
	const { selectOption } = props
	const loggedIn = useSelector(selectLoggedIn)
	return <Menu>
      <MenuButton>Select Deck</MenuButton>
      <MenuItems anchor="right start" className="bg-white p-5">
        <MenuItem>
			<button type="button" onClick={()=>selectOption("local")} className="mb-2">
				Local Deck
			</button>
        </MenuItem>
		{loggedIn && <>
        <MenuItem>
			<button onClick={()=>selectOption("deck1")} className="mb-2">
		  	Deck 1
			</button>
        </MenuItem>
		</>}
      </MenuItems>
    </Menu>
}

function SelectDeckToEdit(props: {
	saved: boolean, 
	error: (msg: string) => void
	select: (deck: deckOption) => void
}) {
	const { saved, error, select } = props

	const selectOption = (d: deckOption) => {
		if (!saved) {
			error("You have unsaved changes!")
			return
		}
		select(d)
	}

	return <div className="flex flex-col items-start h-full">
		<SelectDeck selectOption={selectOption}/>
	</div>
}

export const DeckEditor = (): JSX.Element => {
	const loggedIn = useSelector(selectLoggedIn)

	const [newPopup, closePopup, popupText] = usePopup()

	const [cardHovered, setCardHovered] = useState("")

	const [cards, setCards] = useState<Cards>({})
	const [ogDeck, setOGDeck] = useState<DeckData>({})
	const [deck, setDeck] = useState<DeckData>({})

	const [deckName, setDeckName] = useState<deckOption>("loading")
	const [saved, setSaved] = useState(true)

	async function getDeck() {
		if (!loggedIn) return

		axios.get(`${API_URL}/deck`, {
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

	async function uploadDeck() {
		axios.put(`${API_URL}/deck`, deck, {
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

	function saveDeck() {
		if (deckName == 'local') {
			localStorage.setItem('deck', JSON.stringify(deck))

			axios.put(`${API_URL}/validatedeck`, deck)
			.then((res) => {
				if (res.status == 200) {
					newPopup("Deck saved to browser")
					setSaved(true)
				} else {
					newPopup(res.data)
				}
			}).catch((e) => {
				newPopup(e.response.data)
			})
		} else {
			uploadDeck()
		}
	}

	useEffect(() => {
		axios.get(`${API_URL}/cards`)
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

	//return (<div className={}>
	return <HomeWrapper>
		<Popup closePopup={closePopup} text={popupText}/>

		<div className="flex gap-2 mb-2 items-center">
			<div>{deckName != 'loading' && `Editing ${deckName}${!saved && '*' || ''}`}</div>
			<SelectDeckToEdit
				saved={saved} 
				error={newPopup}
				select={(opt: deckOption) => {
					setDeckName("loading")
					setOGDeck({})
					setDeck({})
					switch (opt) {
					case "local":
						const d = localStorage.getItem('deck')
						const deckParsed: DeckData = 
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
				}}/>

			{deckName != 'loading' &&
				<button className="" onClick={saveDeck}>Save</button>
			}
			{!saved &&
				<button className="" onClick={() => {
					setDeck(ogDeck)
					setSaved(true)
				}}>
					Reset
				</button>
			}
		</div>

		<DoubleMenu left={<div className="flex flex-col items-start h-[60vh] "> 
			<div className="overflow-scroll bg-gray-100 w-full h-[60vh] p-2">
				{ deckName != 'loading' && Object.keys(cards).map((name: string)=> {
					return <div 
						className="w-full flex flex-row self-center justify-between items-center" 
						onMouseEnter={() => setCardHovered(name)}
						onMouseLeave={() => setCardHovered('')}
						key={name}>
						<label className="text-center">{name}</label>
						<div className="flex">
							<button className="sm-square" onClick={() => removeCard(name)}>-</button>
							<button className="sm-square" onClick={() => addCard(name)}>+</button>
						</div>
					</div>
				}) || <p>select a deck to view cards and edit your deck</p>

				}
				</div>
			</div>}
			right={<DeckList deck={deck}/>}
		>
		</DoubleMenu>

		{cardHovered && <CardInfoView 
		className="absolute top-40 left-50 bg-gray-100 p-4 w-[150px] h-[170px]"
		info={cards[cardHovered]} name={cardHovered}/>}
	</HomeWrapper>
}
