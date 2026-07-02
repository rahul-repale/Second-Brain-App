import express from "express";
import { Auth } from "../middlewares/AuthMiddleware.js";
import { SignUp } from "../controllers/signUp.js"
import { SignIn } from "../controllers/signIn.js"
import { GetContent } from "../controllers/getContent.js"
import { CreateCard } from "../controllers/createCards.js"
import { deleteContent } from "../controllers/deleteCard.js"
import { updateContent } from "../controllers/updateContent.js";
import { createShareLink } from "../controllers/createShareLink.js";
import { fetchSharedLink } from "../controllers/fetchSharedBrain.js";
import { querySearch } from "../controllers/querySearch.js";

export const UserRouter = express.Router()

UserRouter.post("/v1/signup", SignUp);
UserRouter.post("/v1/signin", SignIn);
UserRouter.get("/v1/content", Auth, GetContent);
UserRouter.post("/v1/content", Auth, CreateCard);
UserRouter.delete("/v1/content", Auth, deleteContent);
UserRouter.put("/v1/content", Auth, updateContent);
UserRouter.post("/v1/share", Auth, createShareLink);
UserRouter.get("/v1/share/:shareLink", fetchSharedLink)
UserRouter.post("/v1/query", Auth, querySearch);