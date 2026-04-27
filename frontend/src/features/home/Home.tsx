import { type JSX, ReactNode } from "react"
import { Popup, usePopup } from "@/features/component/popup"
import DeckList from "@/features/deck/DeckList"
import { CreateOrJoinLobby } from "@/features/home/Lobby"
import { AvailableLobbies, LobbyDisplay, } from "@/features/home/LobbyMenu"
import { 
	selectLoggedIn,
	selectNickname,
	setNickname,
	selectChat,
	selectUsername,
	useAppDispatch, 
	selectLobbies,
	selectLobbyId,
	selectDeckData,
} from "../../app/store"
import { send } from "@/app/middleware"
import { useSelector } from "react-redux"
import { HomeWrapper } from "@/features/home/HomeWrapper"



interface DoubleMenuProps {
	left: ReactNode;
	right: ReactNode;
	className?: string;
	children?: any; 
}

export function DoubleMenu({left, right, className, children}: DoubleMenuProps): JSX.Element {
	return <div className={`flex gap-3 items-center justify-center w-lg min-h-[10rem] items-stretch ${className}`}>
		<div className="w-[50%]">{left}</div>
		<div className="w-[50%] bg-gray-100">{right}</div>
		{children}
	</div>
}

export const Home = (): JSX.Element => {
	const dispatch = useAppDispatch()
	const loggedIn = useSelector(selectLoggedIn)
	const lobbyId = useSelector(selectLobbyId)
	const username = useSelector(selectUsername)
	const lobbies = useSelector(selectLobbies)
	const nickname = useSelector(selectNickname)
	const [newPopup, closePopup, popupText] = usePopup()
	const ingameDeck = useSelector(selectDeckData)


	const sendMsg = (msg: string, body?: any) => {
		dispatch(send({Msg: msg, Body: body}))
	}

	const userInALobby = () => lobbyId > 0


	function createLobby() {
		if (!nickname) { 
			if (!loggedIn || !username) {
				newPopup('Must enter a nickname to join as a guest')
				return
			}
			sendMsg("create lobby", {nickname: username})
			dispatch(setNickname(username))
			return
		}
		sendMsg("create lobby", {nickname: nickname})
		dispatch(setNickname(nickname))
	}

	function joinLobby(lobbyId: number) {
		sendMsg("join lobby", {
			lobbyId: lobbyId, 
			nickname: nickname || username})

		dispatch(setNickname(nickname || username))
	}

	const chat = useSelector(selectChat)


	return <HomeWrapper>
		<Popup 
			closePopup={closePopup} 
			text={popupText}
		/>
		<div>
			{!userInALobby() && <DoubleMenu
				left={<AvailableLobbies 
					lobbies={lobbies} 
					sendMsg={sendMsg}/>}

				right={<CreateOrJoinLobby 
					nickname={nickname} 
					setNickname={(n: string) => dispatch(setNickname(n))}
					createLobby={createLobby}
					joinLobby={joinLobby}/>}
			/>}

			{userInALobby() && <DoubleMenu
				left={<DeckList deck={ingameDeck}/>}

				right={<LobbyDisplay 
					nickname={nickname}
					sendMsg={sendMsg}
					chat={chat}/>}
			/>}
		</div>
	</HomeWrapper>
}
