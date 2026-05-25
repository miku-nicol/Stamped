const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { createProject, addDeliverable, getProjects, getProjectStats, getClientProject, generateClientLink, getProjectById, editDeliverable, getProjectEditInfo, deleteDeliverable, editProjectBasicInfo, deleteProject, sendConfirmationOTP, resendConfirmationOTP, confirmProject, submitDeliverable, clientApproveDeliverable, clientRequestRevision } = require("./projectController");


const projectRouter = express.Router()


projectRouter.get("/client/:token", getClientProject)
projectRouter.post("/client/:token/send-otp", sendConfirmationOTP)
projectRouter.post("/client/:token/resend-otp", resendConfirmationOTP);
projectRouter.post("/client/:token/confirm", confirmProject);
projectRouter.post("/client/:token/deliverable/:deliverableId/approve",clientApproveDeliverable);
projectRouter.post("/client/:token/deliverable/:deliverableId/request-revision", clientRequestRevision)
 

projectRouter.use(authenticate);

projectRouter.post("/", createProject)
projectRouter.post("/:projectId/deliverable", addDeliverable)
projectRouter.get("/", getProjects),
projectRouter.get("/:projectId", getProjectById);
projectRouter.get("/stats", getProjectStats);
projectRouter.post("/:projectId/generate-link", generateClientLink);
projectRouter.put("/:projectId", editProjectBasicInfo);
projectRouter.get("/:projectId/edit", getProjectEditInfo)
projectRouter.put("/:projectId/deliverable/:deliverableId", editDeliverable)
projectRouter.delete("/:projectId/deliverable/:deliverableId", deleteDeliverable); 
projectRouter.delete("/:projectId", deleteProject);
projectRouter.post("/:projectId/deliverable/:deliverableId/submit", submitDeliverable)



module.exports = projectRouter;