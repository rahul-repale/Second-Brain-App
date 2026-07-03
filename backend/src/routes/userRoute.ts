import express from "express";
import { auth } from "../middlewares/auth.js";
import { signUp } from "../controllers/signUp.js"
import { signIn } from "../controllers/signIn.js"
import { getContent } from "../controllers/getContent.js"
import { createCard } from "../controllers/createCards.js"
import { deleteContent } from "../controllers/deleteCard.js"
import { updateContent } from "../controllers/updateContent.js";
import { createShareLink } from "../controllers/createShareLink.js";
import { fetchSharedLink } from "../controllers/fetchSharedBrain.js";
import { querySearch } from "../controllers/querySearch.js";

export const UserRouter = express.Router()

UserRouter.post("/v1/signup", signUp);
UserRouter.post("/v1/signin", signIn);
UserRouter.get("/v1/content", auth, getContent);
UserRouter.post("/v1/content", auth, createCard);
UserRouter.delete("/v1/content", auth, deleteContent);
UserRouter.put("/v1/content", auth, updateContent);
UserRouter.post("/v1/share", auth, createShareLink);
UserRouter.get("/v1/share/:shareLink", fetchSharedLink)
UserRouter.post("/v1/query", auth, querySearch);