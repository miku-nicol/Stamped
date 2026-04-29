const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Define activity schema first
const activitySchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'project_created',
      'client_confirmed_via_OTP',
       'deliverable_submitted',
      'deliverable_approved',
      'deliverable_rejected',
      'payment_status_updated',
       'deliverable_added',
        'project_reopened',
      'project_completed',
      'deliverable_updated',
     
    ]
  },
   
  performedBy: {
    type: String,
    enum: ['freelancer', 'client', 'system'],
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  description: {
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
    enum: ['approved', 'rejected','pending_approval'],
    default: 'pending_approval'
  },
   
  deliverableType: {
  type: String,
  enum: ['original', 'extra'],
  default: 'original'
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
   
  version: {
  type: Number,
  default: 1
},
previousVersions: [
  {
    description: String,
    fileUrl: String,
    submittedAt: Date,
    version: Number
  }
],
  
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
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD']
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
      enum: ['draft', 'pending_confirmation', 'active', 'completed'],
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
    select: false, 

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

    // Add to project schema
clientSessionToken: {
  type: String,
  select: false,
  default: null
},
clientSessionExpiresAt: {
  type: Date,
  default: null
},
clientLastActivityAt: {
  type: Date,
  default: null
},
sessionTrustLevel: {
  type: String,
  enum: ['high', 'medium', 'low'],
  default: 'low'
},
    
    // Payment Tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
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

  agreedSnapshot: {
    deliverables: [
    {
      description: String,
      deliverableType: String
    }
  ],
    amount: Number,
    dueDate: Date
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
        delete ret.clientSessionToken;
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
projectSchema.index({ clientSessionToken: 1 }, { sparse: true });

// Generate unique client link token before save
projectSchema.pre('save', function(next) {
  if (!this.clientLinkToken) {
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


module.exports = mongoose.model("Project", projectSchema);