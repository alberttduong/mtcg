import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from "react"

interface PopupProps {
	closePopup: () => void,
	text: string,
	title?: string,
}

export function usePopup(): [(text: string)=>void, ()=>void, string] {
	const [popupText, setText] = useState("")
	const newPopup = (text: string) => setText(text)
	const closePopup = () => setText("")
	return [ newPopup, closePopup, popupText ]
}

export function Popup(props: PopupProps) {
	const {closePopup, text, title} = props

  return (
    <>
      <Dialog open={text!=""} onClose={closePopup} className="relative z-50">
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 border bg-white p-12">
		<DialogTitle>{title}
		</DialogTitle>
            <Description>{text}</Description>
            <div className="flex gap-4">
              <button onClick={closePopup}>Close</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
