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

const findByClientLinkToken = (token) => {
  return Project.findOne({ clientLinkToken: token });
};

const findByShareableId = (shareableId) => {
  return Project.findOne({ shareableId });
};

const findByFreelancer = async (freelancerId, options = {}) => {
  const {
    status,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const query = { freelancerId };

  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [projects, total] = await Promise.all([
    Project.find(query).sort(sort).skip(skip).limit(limit),
    Project.countDocuments(query),
  ]);

  return {
    projects,
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

// ==================== DELIVERABLES ====================

const pushDeliverable = (projectId, deliverableData) => {
  return Project.findByIdAndUpdate(
    projectId,
    { $push: { deliverables: deliverableData } },
    { new: true }
  );
};

const updateDeliverableByIndex = async (projectId, index, updateData) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (!project.deliverables?.[index]) return null;

  Object.assign(project.deliverables[index], updateData);

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
    { new: true }
  );
};

// ==================== ACTIVITY ====================

const pushActivity = (projectId, activity) => {
  return Project.findByIdAndUpdate(
    projectId,
    { $push: { activities: activity } },
    { new: true }
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
    { new: true }
  );
};

const clearOTP = (token) => {
  return Project.findOneAndUpdate(
    { clientLinkToken: token },
    {
      clientConfirmationOTP: null,
      clientConfirmationOTPExpires: null,
    },
    { new: true }
  );
};

// ==================== CLIENT CONFIRMATION ====================

const findForConfirmation = (token) => {
  return Project.findOne({ clientLinkToken: token });
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
    { new: true }
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
    { new: true }
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
    { new: true }
  );
};

// ==================== QUERIES ====================

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

  // Deliverables
  pushDeliverable,
  updateDeliverableByIndex,
  setDeliverableStatus,

  // Activity
  pushActivity,

  // OTP
  setOTP,
  clearOTP,

  // Confirmation
  findForConfirmation,

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