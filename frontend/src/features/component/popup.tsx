import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from "react"

export type NewPopupFunc = (text: string)=>void

interface PopupProps {
	closePopup: () => void,
	closeText?: string,
	text: string,
	title?: string,
	vertical?: boolean,
}

export function usePopup(): 
	[
		newPopup: NewPopupFunc,
		closePopup: ()=>void, 
		popupText: string
	] 
{
	const [popupText, setText] = useState("")
	const newPopup = (text: string) => setText(text)
	const closePopup = () => setText("")
	return [ newPopup, closePopup, popupText ]
}

export function Popup(props: PopupProps) {
	const {closePopup, text, title, closeText, vertical} = props

  return <AbstractPopup
			vertical={vertical}
			closePopup={closePopup}
			text={text}
			title={title}
			closeText={closeText||"Close"}/>
}

interface AbstractPopupProps {
	closePopup: () => void,
	text: string,
	title?: string,
	OkElement?: React.ReactNode,
	closeText: string,
	vertical?: boolean,
}

function AbstractPopup(props: AbstractPopupProps) {
	const {
		closePopup, 
		text,
		title,
		OkElement,
		closeText,
		vertical,
	} = props

  return (
    <>
      <Dialog open={text!=""} onClose={closePopup} className="relative z-50">
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 border bg-white p-12">
		<DialogTitle>{title}
		</DialogTitle>
            <Description>{text}</Description>
            <div className={`flex gap-4 ${vertical?"flex-col":""}`}>
				{OkElement}
            	<button onClick={closePopup}>{closeText}</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export function ConfirmPopup(props: PopupProps & {
	OkElement: React.ReactNode
}) {
	const {
		closePopup, 
		closeText,
		text,
		title,
		OkElement,
		vertical,
	} = props

	return <AbstractPopup
		vertical={vertical}
		closePopup={closePopup}
		text={text}
		title={title}
		OkElement={OkElement}
		closeText={closeText || "Cancel"}
	/>
}

