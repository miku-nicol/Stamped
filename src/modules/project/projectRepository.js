const Project = require("./projectModel");

const toObjectId = (id) => id; 

const createProject = (projectData) => {
  return Project.create(projectData);
};

const findById = (projectId) => {
  return Project.findById(projectId);
};

const findByIdAndOwner = async (projectId, freelancerId) => {
  const project = await Project.findOne({
    _id: projectId,
    freelancerId: freelancerId
  });
  return project;
};

const findByClientLinkToken = (token) => {
  return Project.findOne({ clientLinkToken: token }).select('+clientConfirmationOTP   +clientConfirmationOTPExpires');
};

const findByShareableId = (shareableId) => {
  return Project.findOne({ shareableId });
};

const findByFreelancer = async (freelancerId, options = {}) => {
  const {
    status ='all',
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const query = { freelancerId };

 if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [projects, total] = await Promise.all([
    Project.find(query).sort(sort).skip(skip).limit(limit),
    Project.countDocuments(query),
  ]);

  const formattedProjects = projects.map(project => ({
    _id: project._id,
    projectName: project.projectName,
    clientName: project.clientName,
    clientPhone: project.clientPhone,
    totalAmount: project.totalAmount,
    dueDate: project.dueDate,
    status: project.status,
    deliverablesCount: project.deliverables?.length || 0,
    approvedCount: project.deliverables?.filter(d => d.status === 'approved').length || 0,
    createdAt: project.createdAt,
    clientConfirmed: project.clientConfirmed,
    areTermsLocked: project.areTermsLocked
  }));

  return {
    projects: formattedProjects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

const updateProjectById = (projectId, updateData) => {
  return Project.findByIdAndUpdate(projectId, updateData, {
    new: true,
    runValidators: true,
  });
};

const deleteProjectById = (projectId) => {
  return Project.findByIdAndDelete(projectId);
};

const updateProjectBasicInfo = async (projectId, updateData) => {
  const allowedUpdates = ['projectName', 'clientName', 'clientEmail', 'clientPhone', 'dueDate',];
  const updates = {};

  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key]= updateData[key];
    }
  });

  return Project.findByIdAndUpdate(
    projectId,
    { $set: updates },
    { new: true, runValidators: true }
  );
};

const updateDeliverableFields = async (projectId, index, updateData) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables[index]) return null;
  
  const allowedFields = ['item', 'amount'];
  
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      project.deliverables[index][field] = updateData[field];
    }
  });
  
  // Recalculate total project amount
  project.amount = project.deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  await project.save();
  return project;
};

const deleteDeliverable = async (projectId, index) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables[index]) {
    throw new Error('Deliverable not found');
  };
  
  project.deliverables.splice(index, 1);
  
  // Recalculate total project amount
  project.amount = project.deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  await project.save({ validateBeforeSave: true });
  return project;
};

const pushDeliverable = (projectId, deliverableData) => {
  return Project.findByIdAndUpdate(
    projectId,
    { $push: { deliverables: deliverableData } },
 { returnDocument: 'after' }
  );
};

const updateDeliverableByIndex = async (projectId, index, updateData) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables?.[index]) return null;

  Object.assign(project.deliverables[index], updateData);

  // Recalculate project total amount
  project.amount = project.deliverables.reduce((sum, d) => sum + (d.amount || 0), 0);
  

  await project.save();
  return project;
};

const setDeliverableStatus = (projectId, index, status, approvedAt) => {
  const update = {
    [`deliverables.${index}.status`]: status,
  };

  if (approvedAt) {
    update[`deliverables.${index}.approvedAt`] = approvedAt;
  }

  return Project.findByIdAndUpdate(
    projectId,
    { $set: update },
    { returnDocument: 'after' }
  );
};

const areAllDeliverablesApproved = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  
  return project.deliverables.every(d => d.status === 'approved');
};

const approveDeliverable = async (projectId, index) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables[index]) return null;
  
  project.deliverables[index].status = 'approved';
  project.deliverables[index].approvedAt = new Date();
  
  await project.save();
  return project;
};

const submitDeliverable = async (projectId, index, fileUrl) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables[index]) return null;
  
  project.deliverables[index].fileUrl = fileUrl;
  project.deliverables[index].submittedAt = new Date();
  project.deliverables[index].status = 'pending_approval';
  
  await project.save();
  return project;
};

const requestRevision = async (projectId, index, revisionNotes) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables[index]) return null;
  
  // Change status to 'pending' (waiting for freelancer to revise)
  project.deliverables[index].status = 'pending';
  project.deliverables[index].revisionNotes = revisionNotes;
  project.deliverables[index].revisionRequestedAt = new Date();
  
  await project.save();
  return project;
};


const getProjectsNeedingRevisions = async (freelancerId) => {
  return Project.find({
    freelancerId: freelancerId,
    'deliverables.status': 'pending',
    'deliverables.revisionNotes': { $exists: true, $ne: null }
  }).sort({ updatedAt: -1 });
};

// ==================== ACTIVITY ====================

const pushActivity = (projectId, activity) => {
  console.log("Repository: pushActivity called");
  return Project.findByIdAndUpdate(
    projectId,
    { $push: { activities: activity } },
 { returnDocument: 'after' }
  );
};



const findByClientEmail = (email) => {
  return Project.find({ clientEmail: email })
    .sort({ createdAt: -1 })
    .lean();
};

const findOverdue = (freelancerId) => {
  return Project.find({
    freelancerId,
    paymentStatus: { $ne: "paid" },
    dueDate: { $lt: new Date() },
  }).sort({ dueDate: 1 });
};


const saveConfirmationOTP = async (projectId, otp, expiresAt) => {
  return Project.findByIdAndUpdate(
    projectId,
    {
      clientConfirmationOTP: otp,
      clientConfirmationOTPExpires: expiresAt
    },
    { new: true }
  );
};

const verifyOTPAndConfirm = async (token, otp, clientName, clientIdentifier) => {
  const project = await Project.findOne({ clientLinkToken: token });
  
  if (!project) {
    return { success: false, error: "Invalid project link" };
  }
  
  // Check OTP validity
  if (project.clientConfirmationOTP !== otp) {
    return { success: false, error: "Invalid OTP code" };
  }
  
  if (new Date() > project.clientConfirmationOTPExpires) {
    return { success: false, error: "OTP has expired. Please request a new code." };
  }

   const agreedSnapshot = {
    deliverables: project.deliverables.map(d => ({
      item: d.item,
      amount: d.amount,
      deliverableType: d.deliverableType
    })),
    amount: project.amount,
    dueDate: project.dueDate,
    currency: project.currency,
    projectName: project.projectName,
    clientName: project.clientName,
    clientEmail: project.clientEmail
  };
   project.agreedSnapshot = agreedSnapshot;
  project.areTermsLocked = true;
  project.clientConfirmed = true;
  project.clientConfirmedAt = new Date();
  project.clientConfirmedBy = clientName || clientIdentifier;
  project.status = 'active';
  
  // Clear OTP
  project.clientConfirmationOTP = null;
  project.clientConfirmationOTPExpires = null;
  
  await project.save();
  
  return { success: true, project };
};

const resendConfirmationOTP = async (token, otp, expiresAt) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token },
    {
      clientConfirmationOTP: otp,
      clientConfirmationOTPExpires: expiresAt
    },
    { new: true }
  );
};

const clearOTP = async (projectId) => {
  return Project.findByIdAndUpdate(
    projectId,
    {
      clientConfirmationOTP: null,
      clientConfirmationOTPExpires: null
    },
    { new: true }
  );
};
 
const isProjectConfirmed = async (token) => {
  const project = await Project.findOne({ clientLinkToken: token });
  if (!project) return false;
  return project.clientConfirmed === true;
};



module.exports = {
  // CRUD
  createProject,
  findById,
  findByClientLinkToken,
  findByShareableId,
  findByFreelancer,
  updateProjectById,
  deleteProjectById,
  findByIdAndOwner,

  // Deliverables
  pushDeliverable,
  updateDeliverableByIndex,
  setDeliverableStatus,
  areAllDeliverablesApproved,
  approveDeliverable,
  submitDeliverable,
  requestRevision,
  getProjectsNeedingRevisions,
  deleteDeliverable,
  updateDeliverableFields,
  updateProjectBasicInfo,
  

  // Activity
  pushActivity,

  

  // Queries
  findByClientEmail,
  findOverdue,
  saveConfirmationOTP,
  verifyOTPAndConfirm,
  resendConfirmationOTP,
  clearOTP,
  isProjectConfirmed

};