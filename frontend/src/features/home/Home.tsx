import type { JSX } from "react"
import { Popup, usePopup } from "@/features/component/popup"
import { Link } from "react-router"
import { useState } from "react"
import { 
	AvailableLobbies,
	LobbyDisplay,
} from "@/features/game/LobbyMenu"
import { default as axios } from "axios"

import { 
	type Credentials,
	selectLoggedIn,
	selectChat,
	selectUsername,
	useAppDispatch, 
	selectLobbies,
	selectLobbyId,
	logout,
	loginAsUser,
} from "../../app/store"
import { 
	send,
} from "../../app/middleware"
import { useSelector } from "react-redux"

import { Field, Fieldset, 
	Input, Label, Legend,
	Button
} from '@headlessui/react'

const FieldStyle = "bg-gray-200 p-4"
const FieldLegendStyle = "text-lg font-bold"
const FieldInputStyle = "mt-1 block bg-white"

function LoginForm(props: {login: (c: Credentials) => void}) {
	const { login } = props
	return <form action={(e) => {
		const creds: Credentials = {
			name: e.get("name")?.toString(),
			password: e.get("password")?.toString(),
		}
		login(creds)
	}}>
		<Fieldset className={FieldStyle}>
			<Legend className={FieldLegendStyle}>
				Login
			</Legend>
			<Field>
				<Label className="block">Username</Label>
				<Input 
					//defaultValue="Bill" 
					className={FieldInputStyle} name="name" />
			</Field>
			<Field>
				<Label className="block">Password</Label>
				<Input defaultValue="1234" className={FieldInputStyle} name="password"/>
			</Field>
			<Button type="submit">Log in</Button>
		</Fieldset>
	</form>
}

function SignupForm(props: {signup: (c: Credentials) => void}) {
	const { signup } = props

	return <form action={(e) => {
		// confirm both pw are the same
		const creds: Credentials = {
			name: e.get("name")?.toString(),
			password: e.get("password")?.toString(),
		}
		signup(creds)
	}}>
		<Fieldset className={FieldStyle}>
			<Legend className={FieldLegendStyle}>
				Signup
			</Legend>
			<Field>
				<Label className="block">Username</Label>
				<Input defaultValue="Bill" className={FieldInputStyle} name="name" />
			</Field>
			<Field>
				<Label className="block">Password</Label>
				<Input defaultValue="1234" className={FieldInputStyle} name="password"/>
			</Field>
			<Field>
				<Label className="block">Confirm Password</Label>
				<Input defaultValue="1234" className={FieldInputStyle} name="password"/>
			</Field>
			<Button type="submit">Log in</Button>
		</Fieldset>
	</form>
}

export const Home = (): JSX.Element => {
	const dispatch = useAppDispatch()
	const loggedIn = useSelector(selectLoggedIn)
	const lobbyId = useSelector(selectLobbyId)
	const username = useSelector(selectUsername)
	const lobbies = useSelector(selectLobbies)
	const [nickname, _] = useState('')
	const [newPopup, closePopup, popupText] = usePopup()

	const sendMsg = (msg: string, body?: any) => {
		dispatch(send({Msg: msg, Body: body}))
	}

	function handleLogin(creds: Credentials) {
		if (creds) {
			axios.put('http://localhost:8080/login', creds)
			.then((res) => {
				newPopup(`Successfully logged in as ${creds.name}`)
				dispatch(loginAsUser(creds.name))
				localStorage.setItem('token', res.data)
			}).catch(handleError)
		}
	}

	function handleSignup(creds: Credentials) {
		if (creds) {
			axios.put('http://localhost:8080/signup', creds)
			.then((res) => {
				newPopup(`Successfully created account and logged in as ${creds.name}`)
				dispatch(loginAsUser(creds.name))
				localStorage.setItem('token', res.data)
			}).catch(handleError)
		}
	}

	function handleError(e: any) {
		if (e.response && e.response.status) {
			return newPopup(`Error ${e.response.status} ${e.response.data}`)
		}
		newPopup(`Unknown Error`)
	}

	function createLobby() {
		if (!nickname) { 
			if (!loggedIn || !username) {
				newPopup('Must enter a nickname to join as a guest')
				return
			}
			sendMsg("create lobby", {nickname: username})
			return
		}
		sendMsg("create lobby", {nickname: nickname})
	}

	const chat = useSelector(selectChat)


	return <div className="flex flex-col items-center">
		<Popup 
			closePopup={closePopup} 
			text={popupText}
		/>
		<h1>Beach Wars</h1>
		<h1>Multiplayer TCG</h1>
		<div className="flex gap-3 items-center justify-center w-lg min-h-[10rem] items-stretch">
			<div className="w-[50%]"> 
				{lobbyId <= 0 && <AvailableLobbies lobbies={lobbies} sendMsg={sendMsg}/>}
				{lobbyId > 0 && <LobbyDisplay 
					sendMsg={sendMsg}
					chat={chat}/>}
			</div>
			<div className="w-[50%] bg-gray-100 p-2">
				{lobbyId <= 0 && <div>
					<h2>Create or join a lobby to play</h2>
					<div>
						<label>{loggedIn ? "Nickname" : "Name"}</label>
						<input type="text" className="outline-1" placeholder={loggedIn ? username : ''}/>
					</div>
					<div className="mt-2 flex gap-2">
						<Button onClick={createLobby}>Create</Button>
						<Button>Join</Button>
					</div>
				</div>}
			</div>
		</div>
		<div className="fixed top-10 left-10">
			{username && `Logged in as ${username}`}

			{loggedIn && <>
				<button onClick={() => {
					dispatch(logout())
				}}>
					Logout
				</button>
			</> || <>
				<LoginForm login={handleLogin}/>
				<SignupForm signup={handleSignup}/>
			</>}
		</div>
		<Link to="/" className="fixed right-10 bottom-10">More info</Link>
	</div>
}
