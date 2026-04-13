import express from "express";
import { blockUser, unblockUser, getBlockedUsers, getBlockStatus } from "../controllers/blockController.js";

const router = express.Router();

router.get("/", getBlockedUsers);
router.get("/:userId/status", getBlockStatus);
router.post("/:userId", blockUser);
router.delete("/:userId", unblockUser);

export default router;