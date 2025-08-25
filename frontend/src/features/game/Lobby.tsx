import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"

interface ChatProps {
	chat: string[]
	sendChat: (msg: string) => void
	className?: string
}

export function Chat(props: ChatProps) {
	const { chat, sendChat, className } = props
	const chatBox = useRef<HTMLDivElement>(null)
	const [ msg, setMsg ] = useState("")

	const submit = () => {
		sendChat(msg)
		setMsg("")
	}

	useEffect(() => {
		chatBox.current?.scrollIntoView()
	}, [chat])

	return <div className={className + " bg-white"}>
		<div className="h-[200px] border-1 p-1 overflow-scroll scroll-smooth">
			{chat.map((msg, i) => {
				return <div key={i}>{msg}</div>
			})}
			<div ref={chatBox}></div>
		</div>
		<div className="flex w-full h-[25px]">
			<input 
				className="border-1 border-t-0 w-[80%]"
				type="text" value={msg} 
				onKeyDown={(e) => {
					if (e.key == 'Enter') submit()
				}}
				onChange={(e) => {
					setMsg(e.target.value)
			}}/>
			<button 
				className="w-[20%]"
				type="submit" onClick={() => {
				submit()
			}}>Send</button>
		</div>
	</div>
}

interface LobbyProps {
	lobby: number
	chat: string[]
	sendMsg: (msg: string, body?: any) => void
	className?: string
}

export function Lobby(props: LobbyProps) {
	const {
		lobby, 
		chat,
		sendMsg,
		className,
	} = props;

	function createLobby() {
		sendMsg("create lobby")
	}

	function leaveLobby() {
		sendMsg("leave lobby", {lobbyId: 1})
	}

	function joinLobby() {
		sendMsg("join lobby", {lobbyId: 1})
	}

	function startGame() {
		sendMsg("start game")
	}

	const [v, setV] = useState("nothidden")

	const sidebarVariants = {
		nothidden: {
			left: -0,
		},
		hidden: {
			left: -250,
		}
	}

	return <motion.div 
		className={"w-[250px] bg-yellow-100 p-2 flex " + className}
		variants={sidebarVariants}
		animate={v}
		>
		<motion.button 
			className="absolute top-0 -right-[20px] w-[20px] h-[70px]"
			onClick={() => {
				setV(v == "hidden" ? "nothidden" : "hidden")}
			}>
			x
		</motion.button>
		{/* User in a lobby */}
		{lobby > 0 && <div className="flex-col w-full">
			<label>Your Lobby: {lobby > 0 ? lobby : "None"}</label>
			<div className="flex justify-between m-2">
				<button onClick={leaveLobby}>Leave Lobby</button>
				<button onClick={startGame}>Start game</button>
			</div>
			<Chat className="w-full" chat={chat} sendChat={(msg: string) => {
				sendMsg("chat send", {msg: msg})
			}}/>

		{/* User not in a lobby */}
		</div> || <div className="flex-col w-full">
			<label>You aren't in a Lobby</label>
			<div className="text-sm"><h1>Available Lobbys:</h1>
				<ul>
				<li>Lobby 1: X/Y Players</li>
				</ul>
			</div>
			<div className="flex justify-between m-2">
				<button onClick={createLobby}>Create Lobby</button>
				<button onClick={joinLobby}>Join Lobby</button>
			</div>
		</div>}
	</motion.div>
}
