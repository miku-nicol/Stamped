const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { createProject, addDeliverable, getProjects, getProjectStats, getClientProject, generateClientLink, getProjectById, editDeliverable, getProjectEditInfo, deleteDeliverable, editProjectBasicInfo, deleteProject } = require("./projectController");


const projectRouter = express.Router()


projectRouter.get("/client/:token", getClientProject)
 

projectRouter.use(authenticate);

projectRouter.post("/", createProject)
projectRouter.post("/:projectId/deliverable", addDeliverable)
projectRouter.get("/", getProjects),
projectRouter.get("/:projectId", getProjectById);
projectRouter.get("/stats", getProjectStats);
projectRouter.post("/:projectId/generate-link", generateClientLink);
projectRouter.put("/:projectId", editProjectBasicInfo);
projectRouter.get("/:projectId/edit", getProjectEditInfo)
projectRouter.put("/:projectId/deliverable/:index", editDeliverable)
projectRouter.delete("/:projectId/deliverable/:index", deleteDeliverable); 
projectRouter.delete("/:projectId", deleteProject)


module.exports = projectRouter;