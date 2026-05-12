const { timeStamp } = require("console");
const projectRepository = require("./projectRepository");
const crypto = require("crypto")


const createProject = async (projectData, freelancerId, freelancerName) => {
  console.log("Service: createProject started");
  
  // Validation
  if (!projectData.deliverables || projectData.deliverables.length === 0) {
    throw new Error("At least one deliverable is required");
  }

  // Validate each deliverable has name and amount
  for (const deliverable of projectData.deliverables) {
    if (!deliverable.item) {
      throw new Error("Each deliverable must have a item");
    }
    if (deliverable.amount === undefined || deliverable.amount === null) {
      throw new Error(`Deliverable "${deliverable.item}" must have an amount`);
    }
    if (deliverable.amount < 0) {
      throw new Error(`Deliverable amount cannot be negative`);
    }
  }

  // Format deliverables
  const formattedDeliverables = projectData.deliverables.map(d => ({
    item: d.item,
    amount: d.amount,
    status: 'pending',
    deliverableType: 'original',
    version: 1,
    previousVersions: [],
    submittedAt: new Date()
  }));

  // Calculate total project amount
  const totalAmount = formattedDeliverables.reduce((sum, d) => sum + d.amount, 0);

  // Create project
  const project = await projectRepository.createProject({
    ...projectData,
    deliverables: formattedDeliverables,
    totalAmount,
    freelancerId,
    freelancerName,
    status: 'draft'
  });

  console.log("Service: Project created, adding activity");

  // Record activity - THIS IS WHERE THE ERROR IS HAPPENING
  try {
    await projectRepository.pushActivity(project._id, {
      action: 'project_created',
      description: `Project "${project.projectName}" created with ${project.deliverables.length} deliverables totaling ${project.currency} ${totalAmount.toLocaleString()}`,
      performedByName: freelancerName,
      metadata: {
        deliverableCount: project.deliverables.length,
        totalAmount,
        dueDate: project.dueDate
      }
    });
    console.log("Service: Activity added successfully");
  } catch (activityError) {
    console.error("Service: Error adding activity:", activityError.message);
    // Don't throw - activity logging shouldn't break project creation
  }

  console.log("Service: createProject completed");
    return {
    _id: project._id,
    freelancerId: project.freelancerId,
    freelancerName: project.freelancerName,
    projectName: project.projectName,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    totalAmount: project.totalAmount,
    dueDate: project.dueDate,
    deliverables: project.deliverables.map(d => ({
      item: d.item,
      amount: d.amount,
    })),
    status: project.status,
    paymentStatus: project.paymentStatus,
    clientConfirmed: project.clientConfirmed,
    areTermsLocked: project.areTermsLocked,
    createdAt: project.createdAt
    
  };
};

const canEditProject = (project) => {
  const editableStatuses = ['draft', 'pending'];
  return editableStatuses.includes(project.status);
};


const getEditPermissions = (project) => {
  switch (project.status) {
    case 'draft':
      return {
        canEditBasicInfo: true,
        canEditDeliverables: true,
        canAddDeliverables: true,
        canDeleteDeliverables: true,
        canReorderDeliverables: true,
        message: 'Full edit mode'
      };
    case 'pending':
      return {
        canEditBasicInfo: true,
        canEditDeliverables: true,
        canAddDeliverables: true,
        canDeleteDeliverables: true,
        canReorderDeliverables: true,
        message: 'Full mode edit.'
      };
    case 'active':
    case 'completed':
      return {
        canEditBasicInfo: false,
        canEditDeliverables: false,
        canAddDeliverables: false,
        canDeleteDeliverables: false,
        canReorderDeliverables: false,
        message: 'Project terms are locked. Cannot edit.'
      };
    default:
      return {
        canEditBasicInfo: false,
        canEditDeliverables: false,
        canAddDeliverables: false,
        canDeleteDeliverables: false,
        canReorderDeliverables: false,
        message: 'Cannot edit project'
      };
  }
};


const editProjectBasicInfo = async (projectId, updateData, freelancerId) => {
  console.log("Service: editProjectBasicInfo started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to edit this project");
  }
  
  // Check if editable
  if (!canEditProject(project)) {
    throw new Error(`Cannot edit project in '${project.status}' status`);
  }
  
  const updatedProject = await projectRepository.updateProjectBasicInfo(projectId, updateData);
  
return {
    _id: updatedProject._id,
    freelancerId: updatedProject.freelancerId,
    freelancerName:updatedProject.freelancerName,
    projectName: updatedProject.projectName,
    clientName: updatedProject.clientName,
    clientEmail: updatedProject.clientEmail,
    amount:updatedProject.totalAmount,
    dueDate: updatedProject.dueDate,
   
  };
};

const editDeliverable = async (projectId, index, updateData, freelancerId) => {
  console.log("Service: editDeliverable started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to edit this project");
  }
  
  // Check if editable
  if (!canEditProject(project)) {
    throw new Error(`Cannot edit deliverables when project is '${project.status}'`);
  }
  
  const deliverable = project.deliverables[index];
  if (!deliverable) {
    throw new Error("Deliverable not found");
  }
  

  const updatedProject = await projectRepository.updateDeliverableFields(projectId, index, updateData);
  
  
return {
  id: updatedProject._id,
    freelancerId: updatedProject.freelancerId,
    freelancerName:updatedProject.freelancerName,
    projectName: updatedProject.projectName,
    clientName: updatedProject.clientName,
    clientEmail: updatedProject.clientEmail,
    totalAmount:updatedProject.totalAmount,
    dueDate: updatedProject.dueDate,
     deliverables: updatedProject.deliverables.map(d => ({
      item: d.item,
      amount: d.amount,
    })),
};
}


const deleteDeliverable = async (projectId, index, freelancerId) => {
  console.log("Service: deleteDeliverable started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to edit this project");
  }
  
  // Check if editable (only draft and pending_confirmation can delete)
  if (project.status !== 'draft' && project.status !== 'pending') {
    throw new Error(`Cannot delete deliverables when project is '${project.status}'`);
  }
  
  const deliverable = project.deliverables[index];
  if (!deliverable) {
    throw new Error("Deliverable not found");
  }
  
  const deliverableName = project.deliverables[index].item;
  const updatedProject = await projectRepository.deleteDeliverable(projectId, index);

  if(!updatedProject){
    throw new Error('Failed to delete deliverable')
  }

  const recalculatedTotal = updatedProject.deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  return {
    id: updatedProject._id,
    freelancerId: updatedProject.freelancerId,
    freelancerName: updatedProject.freelancerName,
    projectName: updatedProject.projectName,
    clientName: updatedProject.clientName,
    clientEmail: updatedProject.clientEmail,
    totalAmount: recalculatedTotal,
    dueDate: updatedProject.dueDate,
    deliverables: updatedProject.deliverables.map((d, idx) => ({
      id: idx,
      item: d.item,
      amount: d.amount,
      status: d.status
    })),
  };
};

const getProjectEditInfo = async (projectId, freelancerId) => {
  console.log("Service: getProjectEditInfo started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to view this project");
  }
  
  const permissions = getEditPermissions(project);
  
  return {
    project: {
      _id: project._id,
      projectName: project.projectName,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      dueDate: project.dueDate,
      deliverables: project.deliverables.map((d, idx) => ({
        id: idx,
        item: d.item,
        amount: d.amount,
        status: d.status,
        submittedAt: d.submittedAt
      }))
    },
    permissions,
    canEdit: permissions.canEditBasicInfo || permissions.canEditDeliverables
  };
};


const addDeliverable = async (projectId, deliverableData, freelancerId, isExtra = false) => {
  console.log("Service: addDeliverable started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to modify this project");
  }
  
  // Validation
  if (!deliverableData.item) {
    throw new Error("Deliverable name is required");
  }
  if (deliverableData.amount === undefined || deliverableData.amount === null) {
    throw new Error("Deliverable amount is required");
  }
  if (deliverableData.amount < 0) {
    throw new Error("Deliverable amount cannot be negative");
  }
  
  const newDeliverable = {
    item: deliverableData.item,
    amount: deliverableData.amount,
    status: 'pending',
    deliverableType: isExtra ? 'extra' : 'original',
    version: 1,
    previousVersions: [],
    submittedAt: new Date()
  };
  
  const updatedProject = await projectRepository.pushDeliverable(projectId, newDeliverable);

  const recalculatedTotal = updatedProject.deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);

  return {
    id: updatedProject._id,
    freelancerId: updatedProject.freelancerId,
    freelancerName:updatedProject.freelancerName,
    projectName: updatedProject.projectName,
    clientName: updatedProject.clientName,
    clientEmail: updatedProject.clientEmail,
    totalAmount:recalculatedTotal,
    dueDate: updatedProject.dueDate,
     deliverables: updatedProject.deliverables.map(d => ({
      item: d.item,
      amount: d.amount,
      status: d.status
    })),
  }
};

const getFreelancerProjects = async (freelancerId, options = {}) =>{
console.log('Service: getFreelancerProjects started for freelancer:', freelancerId);
const result = await projectRepository.findByFreelancer(freelancerId, options);
return result;
};

const deleteProject = async (projectId, freelancerId) => {
  console.log("Service: deleteProject started for project:", projectId);
  
  // Find the project
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to delete this project");
  }
  

  console.log(`Deleting project: ${project.projectName} (${project._id})`);
  
  // Delete the project
  const deletedProject = await projectRepository.deleteProjectById(projectId);
  
  if (!deletedProject) {
    throw new Error("Failed to delete project");
  }
  
  return {
    id: deletedProject._id,
    projectName: deletedProject.projectName,
    message: "Project deleted successfully"
  };
};

const getProjectStats = async (freelancerId) => {
  console.log('Service: getProjectStats started for freelancer:', freelancerId);

  const stats = await projectRepository.getProjectStats(freelancerId);
  return stats;

};

const generateClientLink = async (projectId, freelancerId) => {
  console.log("Service: generateClientLink started for project:", projectId);

  const project = await projectRepository.findById(projectId);

  if(!project){
    throw new Error("Project not found");
  }

  if(project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to generate link for this project");
  }

  let clientLinkToken = project.clientLinkToken;
  if (!clientLinkToken) {
    clientLinkToken = crypto.randomBytes(32).toString('hex');
    await projectRespository.updateClientLinkToken(projectId, clientLinkToken);
  }

  const baseUrl = process.env.FRONTEND_URL;
  const clientLink = `${baseUrl}client/project/${clientLinkToken}`;


  try {
    await projectRepository.pushActivity(projectId, {
      action: 'client_link_generated',
      description: `Client shareable link generated`,
      performedBy: 'freelancer',
      performedByName: project.freelancerName,
      metadata: {
        clientLinkToken,
        generatedAt: new Date()
      }
    });
  } catch (activityError) {
    console.log("Activity logging skipped:", activityError.message);
  }

   return {
    success: true,
    clientLink,
    clientLinkToken,
    expiresAt: null, // Links never expire
    message: "Client link generated successfully"
  };
};


const getClientProjectByToken = async (token) => {
  console.log("Service: getClientProjectByToken started");

  const project = await projectRepository.findByClientLinkToken(token);

  if(!project) {
    throw new Error("Invaild or expired project link");
  }

  try{
    await projectRepository.pushActivity(project._id, {
      action: 'client_link_opened',
      description: 'Client viewed the project link',
      performedBy: 'system',
      performedByName: 'system',
      metadata: {
        openedAt: new Date(),
        clientLinkToken: token
      }
    })
  } catch (activityError) {
    console.log("Activity logging skipped:", activityError.message)
  }

    return {
    _id: project._id,
    projectName: project.projectName,
    clientName: project.clientName,
    freelancerName: project.freelancerName,
    amount: project.amount,
    dueDate: project.dueDate,
    deliverables: project.deliverables.map(d => ({
      name: d.name,
      description: d.description,
      amount: d.amount,
      status: d.status
    })),
    clientConfirmed: project.clientConfirmed,
    areTermsLocked: project.areTermsLocked,
    createdAt: project.createdAt
  };

};

const getProjectById = async (projectId, freelancerId) => {
  console.log("Freelancer ID:", freelancerId);
  console.log("Service: getProjectById started for project:", projectId);

  const project = await projectRepository.findById(projectId, freelancerId);

  if(!project){
    throw new Error("Project not found");
  }

   if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to view this project");
  }

  const deliverables = project.deliverables || [];
  const totalDeliverables = deliverables.length;
  const approvedDeliverables = deliverables.filter(d => d.status === 'approved').length;
  const pendingDeliverables = deliverables.filter(d => d.status === 'pending_approval').length;
  const requestRevisionDeliverables = deliverables.filter(d => d.status === 'request_revision').length;


  const totalAmount = deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);

  const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getRelativeTime = (date) => {
  if (!date) return null;
  const now = new Date();
  const diff = now - new Date(date);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
};

const formattedDeliverables = deliverables.map((d, index) => ({
  id: index,
  description: d.description || '',
  amount: d.amount,
  status: d.status,
  submittedAt: d.submittedAt,
  approvedAt: d.approvedAt,
  fileUrl: d.fileUrl,
  version: d.version,
  hasPreviousVersions: (d.previousVersions?.length || 0) > 0
  }));

  const activities = (project.activities || []).map(activity => ({
    action: activity.action,
    description: activity.description,
    performedBy: activity.performedBy,
    performedByName: activity.performedByName,
    timeStamp: activity.timeStamp,
    formattedDate: formatDate(activity.timeStamp),
    metadata: activity.metadata
  }));

  return {
    _id: project._id,
    projectName: project.projectName,
    status: project.status,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    clientConfirmed: project.clientConfirmedAt,
    clientConfirmedAt:project.clientConfirmedAt ,
    totalAmount: totalAmount,
    paymentStatus: project.paymentStatus,
    areTermsLocked: project.areTermsLocked,
    agreedSnapshot: project.agreedSnapshot,
    dueDate: project.dueDate,
    formattedDueDate: formatDate(project.dueDat),
    createdAt: project.createdAt,
    formattedCreatedAt: formatDate(project.createdAt),
    completedAt: project.completedAt,
    deliverablesSummary: {
      total: totalDeliverables,
      approved: approvedDeliverables,
      pending: pendingDeliverables,
      requestRevision: requestRevisionDeliverables,
    },

     deliverables: formattedDeliverables,
    activities: activities,
    

  }

  
};


const submitDeliverableForApproval = async (projectId, index, fileUrl, freelancerId) => {
  console.log("Service: submitDeliverableForApproval started");
  
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  // Check ownership
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("You don't have permission to modify this project");
  }
  
  // Check if project is active
  if (project.status !== 'active') {
    throw new Error("Project must be active to submit deliverables");
  }
  
  // Check if deliverable exists
  const deliverable = project.deliverables[index];
  if (!deliverable) {
    throw new Error("Deliverable not found");
  }
  
  // Update deliverable
  const updatedProject = await projectRepository.submitDeliverable(projectId, index, fileUrl);
  
  // Record activity
  await projectRepository.pushActivity(projectId, {
    action: 'deliverable_submitted',
    description: `Deliverable "${deliverable.name}" submitted for approval`,
    performedBy: 'freelancer',
    performedByName: project.freelancerName,
    metadata: {
      deliverableIndex: index,
      deliverableName: deliverable.name,
      version: deliverable.version + 1,
      submittedAt: new Date()
    }
  });
  
  return updatedProject;
};

/**
 * Client approves deliverable (Client action via token)
 */
const approveDeliverable = async (token, index, clientName) => {
  console.log("Service: approveDeliverable started");
  
  // Find project by client link token
  const project = await projectRepository.findByClientLinkToken(token);
  
  if (!project) {
    throw new Error("Invalid project link");
  }
  
  // Check if project is active and confirmed
  if (!project.clientConfirmed) {
    throw new Error("Project must be confirmed before approving deliverables");
  }
  
  if (project.status !== 'active') {
    throw new Error("Project is not active");
  }
  
  // Check if deliverable exists
  const deliverable = project.deliverables[index];
  if (!deliverable) {
    throw new Error("Deliverable not found");
  }
  
  // Check if already approved
  if (deliverable.status === 'approved') {
    throw new Error("Deliverable already approved");
  }
  
  // Approve deliverable
  const updatedProject = await projectRepository.approveDeliverable(project._id, index);
  
  // Record activity
  await projectRepository.pushActivity(project._id, {
    action: 'deliverable_approved',
    description: `Deliverable "${deliverable.name}" approved by client`,
    performedBy: 'client',
    performedByName: clientName || project.clientConfirmedBy || 'Client',
    metadata: {
      deliverableIndex: index,
      deliverableName: deliverable.name,
      approvedAt: new Date()
    }
  });
  
  // Check if all deliverables are approved - auto-complete project
  const allApproved = await projectRepository.areAllDeliverablesApproved(project._id);
  if (allApproved && project.status !== 'completed') {
    await projectRepository.updateProjectById(project._id, {
      status: 'completed',
      completedAt: new Date()
    });
    
    await projectRepository.pushActivity(project._id, {
      action: 'project_completed',
      description: 'All deliverables approved. Project completed!',
      performedBy: 'system',
      performedByName: 'System',
      metadata: { completedAt: new Date() }
    });
  }
  
  return updatedProject;
};



/**
 * Get deliverable submission history (for version tracking)
 */
const getDeliverableHistory = async (projectId, index, freelancerId) => {
  const project = await projectRepository.findById(projectId);
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  if (project.freelancerId.toString() !== freelancerId) {
    throw new Error("Unauthorized");
  }
  
  const deliverable = project.deliverables[index];
  if (!deliverable) {
    throw new Error("Deliverable not found");
  }
  
  return {
    current: {
      name: deliverable.name,
      description: deliverable.description,
      amount: deliverable.amount,
      status: deliverable.status,
      fileUrl: deliverable.fileUrl,
      submittedAt: deliverable.submittedAt,
      approvedAt: deliverable.approvedAt,
      version: deliverable.version
    },
    previousVersions: deliverable.previousVersions || []
  };
};



module.exports = { createProject, addDeliverable, getFreelancerProjects, getProjectStats, generateClientLink, getClientProjectByToken,getProjectById, getProjectEditInfo, editDeliverable,editProjectBasicInfo, deleteDeliverable, deleteProject };