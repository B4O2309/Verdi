import Friend from '../models/Friend.js';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import { io } from '../socket/index.js';

export const sendFriendRequest = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user._id;

        if (from == to) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        const userExists = await User.exists({ _id: to });
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        let userA = from.toString();
        let userB = to.toString();
        if (userA > userB) [userA, userB] = [userB, userA];

        const [alreadyFriends, existingRequest] = await Promise.all([
            Friend.findOne({ userA, userB }),
            FriendRequest.findOne({
                $or: [{ from, to }, { from: to, to: from }]
            })
        ]);

        if (alreadyFriends) return res.status(400).json({ message: "You are already friends" });
        if (existingRequest) return res.status(400).json({ message: "Friend request already sent" });

        const request = await FriendRequest.create({ from, to, message });

        // Populate sender and recipient info for response and notification
        await request.populate([
            { path: 'from', select: '_id username displayName avatarUrl' },
            { path: 'to', select: '_id username displayName avatarUrl' }
        ]);

        // Notify recipient realtime
        io.to(to.toString()).emit('friend-request-received', request);

        return res.status(201).json({ message: "Friend request sent", request });
    }
    catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: "Friend request not found" });

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You are not authorized to accept this friend request" });
        }

        let userA = request.from.toString();
        let userB = request.to.toString();
        if (userA > userB) [userA, userB] = [userB, userA];

        const isAlreadyFriend = await Friend.findOne({ userA, userB });
        if (isAlreadyFriend) {
            await FriendRequest.findByIdAndDelete(requestId);
            return res.status(400).json({ message: "You are already friends" });
        }

        const [, fromUser, toUser] = await Promise.all([
            Friend.create({ userA, userB }),
            User.findById(request.from).select("_id displayName avatarUrl username").lean(),
            User.findById(request.to).select("_id displayName avatarUrl username").lean(),
            FriendRequest.findByIdAndDelete(requestId)
        ]);

        if (!fromUser) return res.status(404).json({ message: "User not found" });

        const newFriend = {
            _id: fromUser._id,
            displayName: fromUser.displayName,
            avatarUrl: fromUser.avatarUrl,
            username: fromUser.username
        };

        const accepter = {
            _id: toUser._id,
            displayName: toUser.displayName,
            avatarUrl: toUser.avatarUrl,
            username: toUser.username
        };

        // Notify both parties
        io.to(request.from.toString()).emit('friend-request-accepted', {
            requestId,
            newFriend: accepter // Sender receives the accepter as the new friend
        });

        io.to(request.to.toString()).emit('friend-request-accepted', {
            requestId,
            newFriend // Accepter receives the sender as the new friend
        });

        return res.status(200).json({ message: "Friend request accepted", newFriend });
    }
    catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: "Friend request not found" });

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You are not authorized" });
        }

        await FriendRequest.findByIdAndDelete(requestId);

        io.to(request.from.toString()).emit('friend-request-declined', { requestId });
        io.to(request.to.toString()).emit('friend-request-declined', { requestId });

        return res.status(200).json({ message: "Friend request declined" });
    }
    catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const getAllFriends = async (req, res) => {
    try {
        const userId = req.user._id;

        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }]
        })
        .populate("userA", "_id displayName avatarUrl username")
        .populate("userB", "_id displayName avatarUrl username")
        .lean();

        if (!friendships.length) return res.status(200).json({ friends: [] });

        const friends = friendships.map(({ userA, userB }) =>
            userA._id.toString() === userId.toString() ? userB : userA
        );

        return res.status(200).json({ friends });
    }
    catch (error) {
        console.error("Error fetching friends:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const populateFields = "_id username displayName avatarUrl";

        const [sent, received] = await Promise.all([
            FriendRequest.find({ from: userId }).populate("to", populateFields),
            FriendRequest.find({ to: userId }).populate("from", populateFields)
        ]);

        res.status(200).json({ sent, received });
    }
    catch (error) {
        console.error("Error fetching friend requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};