import { Link } from "react-router"

// title, login/signup/logout menus, nav
export function HomeWrapper(props: {className?: string, children: any}) {
	const { className, children } = props

	return <div className={className || "flex flex-col items-center"}>
		<Link to="/" className="flex flex-col items-center mb-8">
			<h1>Beach Wars</h1>
			<h2>Multiplayer TCG</h2>
		</Link>
		<div className="flex justify-center items-end fixed right-10 top-10 gap-3">
			<Link to="/deck"><button className="white-btn">Deck Editor</button></Link>
			<Link to="/rules"><button className="white-btn">Rules</button></Link>
			<AuthForms/>
		</div>
		{children}
	</div>
}

import {
	selectUsername,
	selectLoggedIn,
	useAppDispatch,
	loginAsUser,
	logout,
	type Credentials,
} from "@/app/store"
import { useSelector } from "react-redux"
import { useState } from "react"
import { Field, Fieldset, 
	Input, Label, Legend,
	Button
} from '@headlessui/react'
import { default as axios } from "axios"
import { API_URL } from "@/app/middleware"
import { Popup, usePopup, NewPopupFunc } from "@/features/component/popup"

function handleError(e: any, newPopup: NewPopupFunc) {
	if (e.response && e.response.status) {
		return newPopup(`Error ${e.response.status} ${e.response.data}`)
	}
	newPopup(`Unknown Error`)
}

function AuthForms() {
	const username = useSelector(selectUsername)
	const loggedIn = useSelector(selectLoggedIn)
	const dispatch = useAppDispatch()
	const [visib, setVisib] = useState<'login' | 'signup' | null>(null)
	const [newPopup, closePopup, popupText] = usePopup()

	function handleLogin(creds: Credentials, newPopup: NewPopupFunc) {
		if (creds) {
			axios.put(`${API_URL}/login`, creds)
			.then((res) => {
				newPopup(`Successfully logged in as ${creds.name}`)
				dispatch(loginAsUser(creds.name))
				localStorage.setItem('token', res.data)
			}).catch((e) => handleError(e, newPopup))
		}
	}

	function handleSignup(creds: Credentials, newPopup: NewPopupFunc) {
		if (creds) {
			axios.put(`${API_URL}/signup`, creds)
			.then((res) => {
				newPopup(`Successfully created account and logged in as ${creds.name}`)
				dispatch(loginAsUser(creds.name))
				localStorage.setItem('token', res.data)
			}).catch((e) => handleError(e, newPopup))
		}
	}

	return <div>
		<Popup closePopup={closePopup} text={popupText} />


		{loggedIn && <div className="flex items-center gap-3">
			{username && `Logged in as ${username}`}
			<button onClick={() => {
				dispatch(logout())
			}}>
				Logout
			</button>
		</div> || <>
			<div className="flex relative gap-3">
				{/* tailwind doesnt work with these buttons */}
				<button 
					onClick={() => setVisib(visib == 'login' ? null : 'login')}
					className={visib != 'login' ? "white-btn" : ""}
				>Login</button>
				<button 
					onClick={() => setVisib(visib == 'signup' ? null : 'signup')}
					className={visib != 'signup' ? "white-btn" : ""}
				>Sign up</button>
			</div>
			{ visib && (visib == 'login' ?
				<LoginForm login={(c) => handleLogin(c, newPopup)}/> :
				<SignupForm signup={(c) => handleSignup(c, newPopup)}/>)
			}
		</>}
	</div>
}

const FieldStyle = "bg-gray-200 p-4"
const FieldLegendStyle = "text-lg font-bold"
const FieldInputStyle = "mt-1 block bg-white"

function LoginForm(props: {login: (c: Credentials) => void}) {
	const { login } = props
	return <form 
		className="absolute right-0"
		action={(e) => {
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

	return <form 
		className="absolute right-0"
		action={(e) => {
			const p = e.get("password")?.toString()
			if (p !== e.get("confirmpassword")?.toString()) {
				// todo new popup
				return
			}
			
			const creds: Credentials = {
				name: e.get("name")?.toString(),
				password: e.get("password")?.toString(),
			}
			signup(creds)
		}
	}>
		<Fieldset className={FieldStyle}>
			<Legend className={FieldLegendStyle}>
				Sign up
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
				<Input defaultValue="1234" className={FieldInputStyle} name="confirmpassword"/>
			</Field>
			<Button type="submit">Log in</Button>
		</Fieldset>
	</form>
}
