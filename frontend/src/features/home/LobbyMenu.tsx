import { Button } from '@headlessui/react'
import { 
	useSelector
} from "react-redux"
import { 
	selectLobbies,
	selectLobbyReady,
	selectLobbyId,
	selectIsLeader,
} from "@/app/store"
import { lobbyReadyToStartGame } from "@/app/store-util"
import { 
	type SendMsg,
} from "@/app/middleware"
import { Chat } from "../home/Lobby"
import { 
	ConfirmPopup,
	usePopup,	
} from "@/features/component/popup"
import {
	SelectDeck,
	type deckOption,
} from "@/features/deck/DeckEditor"

export interface Member {
	name: string
	isLeader?: boolean
}

export interface Lobby {
	id: number
	members: Member[]
}

export interface Lobbies {
	[id: string]: Lobby
}

interface LobbyMenuProps {
	sendMsg: (msg: string, body?: any) => void
	newPopup?: (msg: string) => void,
	lobbies: Lobbies
}

/*
export function LobbyMenu({sendMsg}: LobbyMenuProps) {
	return <div 
		className={"w-[250px] bg-yellow-100 p-2 flex "}
		>
		<div className="flex-col w-full">
			<label>You aren't in a Lobby</label>
			<div className="flex justify-between m-2">
				<button onClick={()=>sendMsg("create lobby")}>
					Create Lobby
				</button>
				<button onClick={()=>sendMsg("join lobby", {lobbyId: 1})}>
					Join Lobby
				</button>
				<button onClick={()=>sendMsg("leave lobby")}>
					Leave Lobby
				</button>
			</div>
		</div>
	</div>
}
*/

export function AvailableLobbies({lobbies}: LobbyMenuProps) {
	return <div className="bg-gray-100 w-full h-full p-2">
		<p>Available Lobbies:</p>
		{Object.entries(lobbies).map(([id]) => {
			const l = lobbies[Number(id)]
			return <div key={id}>
				<div className="flex items-center">
					Lobby {l.id} ({l.members.length}/5)
				</div>
				{l.members.map((m, i) => {
					return <div key={i}>
						- {m.name}
					</div>
				})}
			</div>
		})}
	</div>
}

export function LobbyDisplay(props: {
	sendMsg: SendMsg, 
	chat: string[], 
	nickname?: string})
{
	const {sendMsg, chat, nickname} = props
	const [newPopup, closePopup, popupText] = usePopup()

	const lobbies = useSelector(selectLobbies)
	const lobbyId = useSelector(selectLobbyId)
	const isLeader = useSelector(selectIsLeader)
	const lobbyReady = useSelector(selectLobbyReady)

	return <div className="bg-gray-100 w-full h-full p-2 relative">
		<label>Lobby {lobbyId}</label>
		<Button 
			onClick={() => {
				newPopup("Are you sure you want to leave the lobby?")
			}}
			className="absolute top-0 right-0 m-1"
		>Leave</Button>
		{lobbies[lobbyId] && lobbies[lobbyId].members.map((m, i) => {
			return <div key={i}>
				- {m.name}{' '}
				{m.isLeader ? '(Leader)' : ''}{' '}
				{lobbyReady[m.name] ? '- ready' : '- not ready'}
			</div>
		})}

		<Chat className="w-full" chat={chat} sendChat={(msg: string) => {
			sendMsg("chat send", {name: nickname || "", msg: msg})
		}}/>

		<ConfirmPopup 
			OkElement={<Button onClick={()=>{
				sendMsg("leave lobby")
				closePopup()
			}}>Confirm</Button>}
			closePopup={closePopup}
			text={popupText}/>

		<div className="flex gap-1">
			<SelectDeck selectOption={(deckName: deckOption)=> {
				const deckString = localStorage.getItem('deck')?.replace(/"/g, "'") || ""
				sendMsg("set deck", {
					name: deckName,
					deck: deckString,
				})
			}}/>

			{isLeader && lobbyReadyToStartGame() &&
				<Button onClick={()=>{
					sendMsg("start game")
				}}>Start Game
				</Button>
			}
		</div>
	</div>
}
