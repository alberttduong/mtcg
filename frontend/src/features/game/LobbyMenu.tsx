import { useState } from "react"
import { useNavigate } from "react-router"
//import { useAppDispatch } from "@/app/store"

import { useSelector } from "react-redux"
import { selectLobbies, selectLobbyId } from "../../app/store"
import { type SendMsg } from "../../app/middleware"
import { Chat } from "./Lobby"

export function LobbyMenu({sendMsg}: LobbyMenuProps) {
	function createLobby() {
		sendMsg("create lobby")
	}
	function joinLobby() {
		sendMsg("join lobby", {lobbyId: 1})
	}

	return <div 
		className={"w-[250px] bg-yellow-100 p-2 flex "}
		>
		{/* User not in a lobby */}
		<div className="flex-col w-full">
			<label>You aren't in a Lobby</label>
			{/*<LobbyList sendMsg={sendMsg}/>*/}
			<div className="flex justify-between m-2">
				<button onClick={createLobby}>Create Lobby</button>
				<button onClick={joinLobby}>Join Lobby</button>
			</div>
		</div>
	</div>
}

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

export function AvailableLobbies({lobbies}: LobbyMenuProps) {
	return <div className="bg-gray-100 w-full h-full p-2"><h1>Available Lobbies:</h1>
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

export function LobbyDisplay(props: {sendMsg: SendMsg, chat: string[]}) {
	const {sendMsg, chat} = props
	const lobbies = useSelector(selectLobbies)
	const lobbyId = useSelector(selectLobbyId)
	return <div className="bg-gray-100 w-full h-full p-2">
		<label>Lobby {lobbyId}</label>
		{lobbies[lobbyId] && lobbies[lobbyId].members.map((m, i) => {
			return <div key={i}>
				- {m.name}{' '}
				{m.isLeader ? '(Leader)' : ''}{' '}
				{m.ready ? '- ready' : '- not ready'}
			</div>
		})}
		<Chat className="w-full" chat={chat} sendChat={(msg: string) => {
			sendMsg("chat send", {msg: msg})
		}}/>
	</div>
}
