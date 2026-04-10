import type { Dispatch, SetStateAction } from "react";
import { DialogContent } from "../ui/dialog";
import { Dialog } from "../ui/dialog";


interface ProfileDialogProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}

const ProfileDialog = ({ open, setOpen }: ProfileDialogProps) => {
  return (
    <Dialog
        open={open}
        onOpenChange={setOpen}
    >
        <DialogContent className="overflow-y-auto p-0 bg-transparent border-0 shadow-2xl">

        </DialogContent>
    </Dialog>
  )
}

export default ProfileDialog