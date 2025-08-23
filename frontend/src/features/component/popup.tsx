import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from "react"

interface PopupProps {
	isOpen: boolean,
	setIsOpen: (arg: boolean) => void,
	text: string,
	title?: string,
}

export function Popup(props: PopupProps) {
	const {isOpen, setIsOpen, text, title} = props

  return (
    <>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 border bg-white p-12">
		<DialogTitle>{title}
		</DialogTitle>
            <Description>{text}</Description>
            <div className="flex gap-4">
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
