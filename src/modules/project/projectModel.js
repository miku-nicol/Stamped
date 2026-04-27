const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Define activity schema first
const activitySchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'project_created',
      'client_confirmed',
      'deliverable_submitted',
      'deliverable_approved',
      'deliverable_rejected',
      'payment_updated',
       'deliverable_added',
        'project_reopened',
      'project_completed'
    ]
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: String,
    enum: ['freelancer', 'client'],
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Define deliverable schema
const deliverableSchema = new Schema({
  description: {
    type: String,
    required: [true, 'Deliverable description is required'],
    trim: true,
    minlength: [5, 'Deliverable must be at least 5 characters'],
    maxlength: [500, 'Deliverable cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isOriginalScope: {
    type: Boolean,
    default: true
  },
  fileUrl: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvalNote: {
    type: String,
    default: null
  },
  
});

const projectSchema = new Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    freelancerName: {
      type: String,
      required: true
    },
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    
    // Client Information
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      minlength: [2, 'Client name must be at least 2 characters']
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    clientPhone: {
      type: String,
      trim: true,
      default: null
    },
    
    // Project Financials
    amount: {
      type: Number,
      required: [true, 'Project amount is required'],
      min: [0, 'Amount cannot be negative']
    },
     
    
    // Deliverables (array of deliverables)
    deliverables: [deliverableSchema],
    areTermsLocked: {
    type: Boolean,
    default: false
  },
    
    // Project Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'completed', 'cancelled'],
      default: 'draft'
    },
    
    // Client Confirmation
    clientConfirmed: {
      type: Boolean,
      default: false
    },
    clientConfirmedAt: {
      type: Date,
      default: null
    },
    clientConfirmedBy: {
      type: String,
      default: null
    },
    
    // Client Link
    clientLinkToken: {
      type: String,
      unique: true,
      sparse: true
    },
    clientConfirmationOTP: {
    type: String,
    select: false  // Never return in API responses
  },
   clientConfirmationOTPExpires: {
    type: Date,
    default: null,
    select: false
  },
    clientLinkGeneratedAt: {
      type: Date,
      default: null
    },
    clientLinkOpenedAt: {
      type: Date,
      default: null
    },
    
    // Payment Tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
    },
    paymentUpdatedAt: {
      type: Date,
      default: null
    },
    
    // Timeline Dates
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    submittedAt: {
      type: Date,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    
    // Additional Fields
    pdfExportUrl: {
      type: String,
      default: null
    },
    shareableId: {
      type: String,
      unique: true,
      default: () => require('crypto').randomBytes(8).toString('hex')
    },
    additionalScope: {
      type: String,
      default: null
    },
    
    // Activity Timeline
    activities: [activitySchema]
  },
  { 
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.clientLinkToken; // Don't expose token in regular responses
        return ret;
      }
    }
  }
);

// Indexes for performance
projectSchema.index({ freelancerId: 1, status: 1 });
projectSchema.index({ freelancerId: 1, createdAt: -1 });
projectSchema.index({ clientLinkToken: 1 });
projectSchema.index({ status: 1, dueDate: 1 });
projectSchema.index({ clientEmail: 1 });
projectSchema.index({ shareableId: 1 });

// Generate unique client link token before save
projectSchema.pre('save', async function(next) {
  if (this.isModified('clientLinkToken') && !this.clientLinkToken) {
    const crypto = require('crypto');
    this.clientLinkToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Auto-update status based on deliverables and confirmation
projectSchema.pre('save', function(next) {
  // If all deliverables are approved and project is active, mark as completed
  if (this.status === 'active' && this.deliverables.length > 0) {
    const allApproved = this.deliverables.every(d => d.status === 'approved');
    if (allApproved && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  next();
});

projectSchema.methods.isOriginalDeliverable = function(index) {
  return this.deliverables[index]?.isOriginalScope || false;
};

// Add activity helper method
projectSchema.methods.addActivity = async function(action, description, performedBy, performedByName, metadata = {}) {
  this.activities.push({
    action,
    description,
    performedBy,
    performedByName,
    timestamp: new Date(),
    metadata
  });
  await this.save();
};

//Add new deliverable (beyond original scope)
projectSchema.methods.addDeliverable = async function(description, performedByName) {
  // Reopen project if it was completed
  if (this.status === 'completed') {
    this.status = 'active';
    await this.addActivity(
      'project_reopened',
      `Project reopened with new deliverable: ${description.substring(0, 50)}...`,
      'freelancer',
      performedByName,
      { newDeliverable: description }
    );
  }
  
  this.deliverables.push({
    description,
    status: 'pending',
    isOriginalScope: false,
    version: 1
  });
  
  await this.addActivity(
    'deliverable_added',
    `New deliverable added: ${description.substring(0, 50)}...`,
    'freelancer',
    performedByName,
    { isOriginalScope: false }
  );
  
  await this.save();
  return this;
};

// Update deliverable (iteration/revision)
projectSchema.methods.updateDeliverable = async function(index, newDescription, fileUrl, performedByName) {
  const deliverable = this.deliverables[index];
  if (!deliverable) throw new Error("Deliverable not found");
  
  // Save previous version
  deliverable.previousVersions.push({
    description: deliverable.description,
    fileUrl: deliverable.fileUrl,
    submittedAt: deliverable.submittedAt,
    version: deliverable.version
  });
  
  // Update to new version
  deliverable.description = newDescription || deliverable.description;
  deliverable.fileUrl = fileUrl || deliverable.fileUrl;
  deliverable.version += 1;
  deliverable.submittedAt = new Date();
  deliverable.status = 'pending'; // Reset status on update
  
  await this.addActivity(
    'deliverable_updated',
    `Deliverable "${deliverable.description.substring(0, 50)}..." updated (v${deliverable.version})`,
    'freelancer',
    performedByName,
    { deliverableIndex: index, version: deliverable.version }
  );
  
  await this.save();
  return this;
};

module.exports = mongoose.model("Project", projectSchema);