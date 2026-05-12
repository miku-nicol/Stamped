const Project = require("./projectModel");

// ==================== HELPERS ====================

const toObjectId = (id) => id; // optional place for mongoose.Types.ObjectId

// ==================== BASIC CRUD ====================

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
  return Project.findOne({ clientLinkToken: token });
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

// get frelancer sata
const getProjectStats = async (freelancerId) => {
  const [total, draft, pendingConfirmation, active, completed, cancelled] = await Promise.all([
    Project.countDocuments({ freelancerId }),
    Project.countDocuments({ freelancerId, status: 'draft' }),
    Project.countDocuments({ freelancerId, status: 'pending_confirmation' }),
    Project.countDocuments({ freelancerId, status: 'active' }),
    Project.countDocuments({ freelancerId, status: 'completed' }),
    Project.countDocuments({ freelancerId, status: 'cancelled' })
  ]);
}

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

/**
 * Delete deliverable from project
 */
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



// ==================== DELIVERABLES ====================

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

// ==================== REQUEST REVISION (instead of reject) ====================

/**
 * Request revision for deliverable
 */
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

/**
 * Get projects needing revisions (for freelancer dashboard)
 */
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

// ==================== OTP ====================

const setOTP = (token, otp, expiresAt) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token },
    {
      clientConfirmationOTP: otp,
      clientConfirmationOTPExpires: expiresAt,
    },
   { returnDocument: 'after' }
  );
};

const clearOTP = (token) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token },
    {
      clientConfirmationOTP: null,
      clientConfirmationOTPExpires: null,
    },
    { returnDocument: 'after' }
  );
};

// ==================== CLIENT CONFIRMATION ====================

const findForConfirmation = (token) => {
  return Project.findOne({ clientLinkToken: token });
};

const updateClientLinkToken = async (projectId, token) => {
  return Project.findByIdAndUpdate(
    projectId,
    {
      clientLinkToken: token,
      clientLinkGeneratedAt: new Date()
    },
    { new: true }
  );
};

// ==================== SESSION ====================

const setSession = (token, sessionToken, expiresAt) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token },
    {
      clientSessionToken: sessionToken,
      clientSessionExpiresAt: expiresAt,
      clientLastActivityAt: new Date(),
    },
  { returnDocument: 'after' }
  );
};

const findValidSession = (token, sessionToken) => {
  return Project.findOne({
    clientLinkToken: token,
    clientSessionToken: sessionToken,
    clientSessionExpiresAt: { $gt: new Date() },
  });
};

const updateSessionActivity = (token, sessionToken) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token, clientSessionToken: sessionToken },
    { clientLastActivityAt: new Date() },
   { returnDocument: 'after' }
  );
};

// ==================== PAYMENT ====================

const updatePayment = (projectId, paymentStatus) => {
  return Project.findByIdAndUpdate(
    projectId,
    {
      paymentStatus,
      paymentUpdatedAt: new Date(),
    },
  { returnDocument: 'after' }
  );
};

// ==================== QUERIES =======  =============

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

// ==================== EXPORTS ====================

module.exports = {
  // CRUD
  createProject,
  findById,
  findByClientLinkToken,
  findByShareableId,
  findByFreelancer,
  updateProjectById,
  deleteProjectById,
  getProjectStats,
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

  // OTP
  setOTP,
  clearOTP,

  // Confirmation
  findForConfirmation,
  updateClientLinkToken,

  // Session
  setSession,
  findValidSession,
  updateSessionActivity,

  // Payment
  updatePayment,

  // Queries
  findByClientEmail,
  findOverdue,
};