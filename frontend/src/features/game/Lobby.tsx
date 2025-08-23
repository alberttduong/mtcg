import { useState } from "react"

interface ChatProps {
	chat: string[]
	sendChat: (msg: string) => void
	className?: string
}

export function Chat(props: ChatProps) {
	const { chat, sendChat, className } = props
	const [ msg, setMsg ] = useState("")

	const submit = () => {
		sendChat(msg)
		setMsg("")
	}

	return <div className={className}>
		<div className="h-[200px] border-1 p-1">
			{chat.map((msg, i) => {
				console.log(chat)
				return <div key={i}>{msg}</div>
			})}
		</div>
			<div className="flex w-full">
				<input 
					className="border-1 border-t-0" 
					type="text" value={msg} 
					onKeyDown={(e) => {
						if (e.key == 'Enter') submit()
					}}
					onChange={(e) => {
						setMsg(e.target.value)
				}}/>
				<button type="submit" onClick={() => {
					submit()
				}}>Send</button>
			</div>
	</div>
}
