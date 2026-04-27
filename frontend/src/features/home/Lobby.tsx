import { useState, useEffect, useRef, type JSX } from "react"
import { usePopup, Popup } from "@/features/component/popup"

interface ChatProps {
	chat: string[]
	sendChat: (msg: string) => void
	className?: string
	transparent?: boolean
	toggleable?: boolean
}

export function Chat(props: ChatProps) {
	const {chat, sendChat, className, toggleable, transparent} = props
	const chatBox = useRef<HTMLDivElement>(null)
	const [msg, setMsg] = useState("")

	const submit = () => {
		sendChat(msg)
		setMsg("")
	}

	const [chatToggle, setChatToggle] = useState(true)

	useEffect(() => {
		chatBox.current?.scrollIntoView()
	}, [chat])

	return <div className={className}>
		<div className={`h-[200px] p-1 ${transparent?"":"border-1"} overflow-scroll scroll-smooth ${chatToggle?"":"hidden"}`}>
			{chat.map((m, i) => {
				return <div key={i}>{m}</div>
			})}
			<div ref={chatBox}></div>
		</div>
		
		<div className="flex w-full h-[25px]">
			{toggleable && <button 
				className="w-[1.5rem]"
				type="submit" onClick={() => {
					setChatToggle(!chatToggle)
			}}>
				{chatToggle ? "X" : "^"}
			</button>}
			<input 
				className={`border-1 ${transparent?"":"border-t-0"} w-[80%]`}
				type="text" 
				value={msg} 
				onKeyDown={(e) => {
					if (e.key === 'Enter') submit()
				}}
				onChange={(e) => {
						setMsg(e.target.value) 
					}
				}
			/>
			<button 
				className="w-[20%]"
				type="submit" onClick={() => {
				submit()
			}}>Send</button>
		</div>
	</div>
}

export function CreateOrJoinLobby(props:
	{
		nickname?: string,
		setNickname: any, 
		createLobby: () => void,
		joinLobby: (lobbyId: number) => void,
	}
): JSX.Element {
	const { nickname, setNickname, createLobby, joinLobby } = props
	const [ newPopup, closePopup, popupText ] = usePopup()
	const [ lobbyNum, setLobbyNum ] = useState("1")

	return <div className="flex-col w-full p-2">
		<label>You aren't in a Lobby</label>

		<br/>
		<label>Nickname:</label>
		<input 
			type="text"
			className="outline-1 bg-white w-full"
			placeholder="(optional if logged in)"
			value={nickname || ""}
			onChange={(e) => {
				setNickname(e.target.value)
			}}
			/>

		<div className="flex justify-center items-center gap-2 mt-2">
			<button onClick={createLobby}>Create Lobby</button>
			<button onClick={() => {
				if (!Number.isInteger(parseInt(lobbyNum))) {
					newPopup(`Invalid lobby number. Try again`)
					setLobbyNum("1")
					return
				}

				joinLobby(parseInt(lobbyNum))
			}}>Join Lobby</button>
			
			<div>
				<input 
					type="number" 
					className="w-[2rem] h-[2rem]"
					placeholder={"1"}
					value={lobbyNum}
					onChange={(e) => {
						setLobbyNum(e.target.value)
					}}
					/>
			</div>
		</div>
		<Popup
			closePopup={closePopup}
			text={popupText}/>
	</div>
}
