import Block from "../models/Block.js";
import { io } from "../socket/index.js";

export const blockUser = async (req, res) => {
    try {
        const blocker = req.user._id;
        const { userId: blocked } = req.params;

        if (blocker.toString() === blocked) {
            return res.status(400).json({ message: "You cannot block yourself" });
        }

        await Block.findOneAndUpdate(
            { blocker, blocked },
            { blocker, blocked },
            { upsert: true, new: true }
        );

        io.to(blocker.toString()).emit("user-blocked", { blockerId: blocker.toString(), blockedId: blocked });
        io.to(blocked.toString()).emit("user-blocked", { blockerId: blocker.toString(), blockedId: blocked });

        return res.status(200).json({ message: "User blocked" });
    }
    catch (error) {
        console.error("Error blocking user:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const blocker = req.user._id;
        const { userId: blocked } = req.params;

        await Block.findOneAndDelete({ blocker, blocked });

        io.to(blocker.toString()).emit("user-unblocked", { blockerId: blocker.toString(), blockedId: blocked });
        io.to(blocked.toString()).emit("user-unblocked", { blockerId: blocker.toString(), blockedId: blocked });

        return res.status(200).json({ message: "User unblocked" });
    }
    catch (error) {
        console.error("Error unblocking user:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getBlockedUsers = async (req, res) => {
    try {
        const blocker = req.user._id;

        const blocks = await Block.find({ blocker })
            .populate("blocked", "_id displayName username avatarUrl")
            .lean();

        const blockedUsers = blocks.map(b => b.blocked);

        return res.status(200).json({ blockedUsers });
    }
    catch (error) {
        console.error("Error fetching blocked users:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


export const getBlockStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userId: otherUserId } = req.params;

        const [iBlockedThem, theyBlockedMe] = await Promise.all([
            Block.exists({ blocker: userId, blocked: otherUserId }),
            Block.exists({ blocker: otherUserId, blocked: userId })
        ]);

        return res.status(200).json({
            iBlockedThem: !!iBlockedThem,
            theyBlockedMe: !!theyBlockedMe,
        });
    }
    catch (error) {
        console.error("Error checking block status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};