// src/modules/project/projectController.js
const projectService = require("./projectService");

const createProject = async (req, res) => {
  try {
    console.log("Create project request received");
    
    const {
      projectName,
      clientName,
      clientEmail,
      clientPhone,
      currency,
      dueDate,
      deliverables
    } = req.body;

    // Validation
    const missingFields = [];
    if (!projectName) missingFields.push('projectName');
    if (!clientName) missingFields.push('clientName');
    if (!clientEmail) missingFields.push('clientEmail');
    if (!clientPhone) missingFields.push('clientPhone');
    if (!dueDate) missingFields.push('dueDate');
    if (!deliverables || deliverables.length === 0) missingFields.push('deliverables');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate each deliverable
    for (let i = 0; i < deliverables.length; i++) {
      if (!deliverables[i].item) {
        return res.status(400).json({
          success: false,
          message: `Deliverable ${i + 1} must have a item`
        });
      }
      if (deliverables[i].amount === undefined || deliverables[i].amount === null) {
        return res.status(400).json({
          success: false,
          message: `Deliverable "${deliverables[i].item}" must have an amount`
        });
      }
    }

    const project = await projectService.createProject(
      {
        projectName,
        clientName,
        clientEmail,
        clientPhone,
        currency: currency || 'NGN',
        dueDate,
        deliverables
      },
      req.user.userId,
      `${req.user.firstName} ${req.user.lastName}`
    );

    return res.status(201).json({
      success: true,
      data: { project },
      message: "Project created successfully"
    });
  } catch (error) {
    console.error("Create project error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create project"
    });
  }
};

const getProjectEditInfo = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await projectService.getProjectEditInfo(projectId, req.user.userId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Project edit info retrieved successfully"
    });
  } catch (error) {
    console.error("Get project edit info error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "You don't have permission to view this project") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project edit info"
    });
  }
};

const editProjectBasicInfo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;
    
    // Validate update data
    const allowedFields = ['projectName', 'clientName', 'clientEmail', 'clientPhone', 'dueDate'];
    const invalidFields = Object.keys(updateData).filter(k => !allowedFields.includes(k));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot update fields: ${invalidFields.join(', ')}`
      });
    }
    
    const project = await projectService.editProjectBasicInfo(
      projectId,
      updateData,
      req.user.userId
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Project updated successfully"
    });
  } catch (error) {
    console.error("Edit project error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes("Cannot edit")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "You don't have permission to edit this project") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update project"
    });
  }
};

const editDeliverable = async (req, res) => {
  try {
    const { projectId, index } = req.params;
    const updateData = req.body;
    
    // Validate update data
    const allowedFields = ['item','amount'];
    const invalidFields = Object.keys(updateData).filter(k => !allowedFields.includes(k));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot update deliverable fields: ${invalidFields.join(', ')}`
      });
    }
    
    // Validate amount if provided
    if (updateData.amount !== undefined && updateData.amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Deliverable amount cannot be negative"
      });
    }
    
    const project = await projectService.editDeliverable(
      projectId,
      parseInt(index),
      updateData,
      req.user.userId
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Deliverable updated successfully"
    });
  } catch (error) {
    console.error("Edit deliverable error:", error.message);
    
    if (error.message === "Project not found" || error.message === "Deliverable not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes("Cannot edit")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update deliverable"
    });
  }
};

const deleteDeliverable = async (req, res) => {
  try {
    const { projectId, index } = req.params;
    
    const project = await projectService.deleteDeliverable(
      projectId,
      parseInt(index),
      req.user.userId
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Deliverable deleted successfully"
    });
  } catch (error) {
    console.error("Delete deliverable error:", error.message);
    
    if (error.message === "Project not found" || error.message === "Deliverable not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes("Cannot delete")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to delete deliverable"
    });
  }
};
 
const addDeliverable = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { item, amount, isExtra = false } = req.body;

    if (!item) {
      return res.status(400).json({
        success: false,
        message: "Deliverable item is required"
      });
    }
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "Deliverable amount is required"
      });
    }
    
    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Deliverable amount cannot be negative"
      });
    }

    const project = await projectService.addDeliverable(
      projectId,
      { item: item, 
        amount: parseFloat(amount) 
      },
      req.user.userId,
      isExtra
    );

    return res.status(200).json({
      success: true,
      data: { project },
      message: "Deliverable added successfully"
    });
  } catch (error) {
    console.error("Add deliverable error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "You don't have permission to modify this project") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to add deliverable"
    });
  }
};

 const getProjects = async (req, res) => {
  try {
    const {
      status = 'all',
      page = 1,
      limit =10,
      sortBy = 'createdAt',
      sortOrder = 'desc'

    } = req.query;

    const result = await projectService.getFreelancerProjects(
      req.user.userId,
      {
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      }
    );
    return res.status(200).json({
      success: true,
      data: result,
      message: "Project retrieved successfully"
    });

  } catch (error) {
    console.error("Get project error:", error.message)
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve projects"
    })
  }
 };

const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log("Controller: deleteProject called for project:", projectId);
    
    const result = await projectService.deleteProject(projectId, req.user.userId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Project deleted successfully"
    });
    
  } catch (error) {
    console.error("Delete project error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "You don't have permission to delete this project") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes("Cannot delete project")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to delete project"
    });
  }
};

 const getProjectStats = async (req, res) => {
  try {
    const stats = await projectService.getProjectStats(req.user.userId);
    
    return res.status(200).json({
      success: true,
      data: stats,
      message: "Project statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Get project stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project statistics"
    });
  }
};

const generateClientLink = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await projectService.generateClientLink(
      projectId,
      req.user.userId
    );
    
    return res.status(200).json({
      success: true,
      data: {
        clientLink: result.clientLink,
        clientLinkToken: result.clientLinkToken
      },
      message: result.message
    });
  } catch (error) {
    console.error("Generate client link error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "You don't have permission to generate link for this project") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to generate client link"
    });
  }
};

const getClientProject = async (req, res) => {
  try {
    const { token } = req.params;
    
    const project = await projectService.getClientProjectByToken(token);
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Project retrieved successfully"
    });
  } catch (error) {
    console.error("Get client project error:", error.message);
    
    if (error.message === "Invalid or expired project link") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project"
    });
  }
};


const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await projectService.getProjectById(projectId, req.user.userId);
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Project retrieved successfully"
    });
  } catch (error) {
    console.error("Get project by ID error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project"
    });
  }
};

const sendConfirmationOTP = async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await projectService.sendConfirmationOTP(token);
    
    return res.status(200).json({
      success: true,
      data: {
        expiresIn: result.expiresIn
      },
      message: result.message
    });
  } catch (error) {
    console.error("Send confirmation OTP error:", error.message);
    
    if (error.message === "Invalid project link") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "Project already confirmed") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to send verification code"
    });
  }
};

const resendConfirmationOTP = async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await projectService.resendConfirmationOTP(token);
    
    return res.status(200).json({
      success: true,
      data: {
        expiresIn: result.expiresIn
      },
      message: result.message
    });
  } catch (error) {
    console.error("Resend confirmation OTP error:", error.message);
    
    if (error.message === "Invalid project link") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "Project already confirmed") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to resend verification code"
    });
  }
};


const confirmProject = async (req, res) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Verification code is required"
      });
    }
    
    
    const result = await projectService.confirmProject(
      token,
      otp
    );
    
    return res.status(200).json({
      success: true,
      data: result.project,
      message: result.message
    });
  } catch (error) {
    console.error("Confirm project error:", error.message);
    
    if (error.message === "Invalid project link") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "Project already confirmed") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "Invalid OTP code") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "OTP has expired. Please request a new code.") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to confirm project"
    });
  }
};


const submitDeliverable = async (req, res) => {
  try {
    const { projectId, index } = req.params;
    const { supportingLinks, submissionNotes } = req.body;
    
    if (!supportingLinks || supportingLinks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one supporting link is required"
      });
    }
    
    // URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    for (const link of supportingLinks) {
      if (!urlPattern.test(link) && !link.startsWith('http')) {
        return res.status(400).json({
          success: false,
          message: `Invalid URL format: ${link}`
        });
      }
    }
    
    const project = await projectService.submitDeliverableForApproval(
      projectId,
      parseInt(index),
      { supportingLinks, submissionNotes: submissionNotes || null },
      req.user.userId,
      `${req.user.firstName} ${req.user.lastName}`
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Deliverable completed successfully"
    });
  } catch (error) {
    console.error("Submit deliverable error:", error.message);
    
    if (error.message === "Project not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    
    if (error.message === "Project must be active to submit deliverables") {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    if (error.message === "At least one supporting link is required") {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    return res.status(500).json({ success: false, message: "Failed to submit deliverable" });
  }
};

/**
 * Client approves deliverable
 */
const clientApproveDeliverable = async (req, res) => {
  try {
    const { token, index } = req.params;
    const { clientName } = req.body;
    
    const project = await projectService.approveDeliverable(
      token,
      parseInt(index),
      clientName || 'Client',
      clientName
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Deliverable approved successfully"
    });
  } catch (error) {
    console.error("Client approve deliverable error:", error.message);
    
    if (error.message === "Invalid project link") {
      return res.status(404).json({ success: false, message: error.message });
    }
    
    if (error.message === "Deliverable already approved") {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    return res.status(500).json({ success: false, message: "Failed to approve deliverable" });
  }
};

/**
 * Client requests revision
 */
const clientRequestRevision = async (req, res) => {
  try {
    const { token, index } = req.params;
    const { revisionReason, clientName } = req.body;
    
    if (!revisionReason || revisionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for revision"
      });
    }
    
    const project = await projectService.requestRevision(
      token,
      parseInt(index),
      revisionReason,
      clientName || 'Client'
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Revision requested successfully"
    });
  } catch (error) {
    console.error("Client request revision error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to request revision" });
  }
};

/**
 * Freelancer submits revised deliverable
 */
const submitRevisedDeliverable = async (req, res) => {
  try {
    const { projectId, index } = req.params;
    const { supportingLinks, submissionNotes } = req.body;
    
    if (!supportingLinks || supportingLinks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one supporting link is required"
      });
    }
    
    const project = await projectService.submitRevisedDeliverable(
      projectId,
      parseInt(index),
      { supportingLinks, submissionNotes: submissionNotes || null },
      req.user.userId
    );
    
    return res.status(200).json({
      success: true,
      data: { project },
      message: "Revised deliverable submitted successfully"
    });
  } catch (error) {
    console.error("Submit revised deliverable error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to submit revised deliverable" });
  }
};



module.exports = { 
  createProject, 
  addDeliverable,
   getProjects,
    getProjectStats, 
    getClientProject, 
    generateClientLink, 
    getProjectById, 
    getProjectEditInfo, 
    editProjectBasicInfo, 
    editDeliverable, 
    deleteDeliverable, 
    deleteProject,
    confirmProject,
    resendConfirmationOTP,
    sendConfirmationOTP,
    submitDeliverable

  };