// Lock terms after client confirmation
projectSchema.methods.lockTerms = async function(clientName) {
  // Save snapshot of agreed terms
  this.agreedSnapshot = {
    deliverables: this.deliverables.map(d => ({
      description: d.description,
      deliverableType: d.deliverableType
    })),
    amount: this.amount,
    dueDate: this.dueDate
  };
  
  this.areTermsLocked = true;
  this.status = 'active';
  this.clientConfirmed = true;
  this.clientConfirmedAt = new Date();
  this.clientConfirmedBy = clientName;
  
  await this.addActivity(
    'client_confirmed_via_OTP',
    `Client confirmed project terms`,
    'client',
    clientName,
    { confirmedAt: new Date() }
  );
  
  await this.save();
  return this;
};

 
//check if deliverables is original
projectSchema.methods.isOriginalDeliverable = function(index) {
  return this.deliverables[index]?.deliverableType === 'original';
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
  return this;
};

//Add new deliverable (beyond original scope)
projectSchema.methods.addDeliverable = async function(description, performedByName, isExtra = false) {
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
    status: 'pending_approval',
   deliverableType: isExtra ? 'extra' : 'original',
    version: 1,
    previousVersions: [],
    submittedAt: new Date()
  });
  
 
  const activityDesc = isExtra 
    ? `Extra deliverable added: ${description.substring(0, 50)}...`
    : `New deliverable added: ${description.substring(0, 50)}...`;
  
   await this.addActivity(
    'deliverable_added',
    activityDesc,
    'freelancer',
    performedByName,
    { deliverableType: isExtra ? 'extra' : 'original' }
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
  deliverable.status = 'pending_approval'; // Reset status on update
  
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


// Submit deliverable for approval
projectSchema.methods.submitDeliverable = async function(index, fileUrl, performedByName) {
  const deliverable = this.deliverables[index];
  if (!deliverable) throw new Error("Deliverable not found");
  
  deliverable.fileUrl = fileUrl;
  deliverable.submittedAt = new Date();
  deliverable.status = 'pending_approval';
  
  await this.addActivity(
    'deliverable_submitted',
    `Deliverable "${deliverable.description.substring(0, 50)}..." submitted for approval`,
    'freelancer',
    performedByName,
    { deliverableIndex: index, version: deliverable.version }
  );
  
  await this.save();
  return this;
};

// Approve deliverable (client action)
projectSchema.methods.approveDeliverable = async function(index, performedByName) {
  const deliverable = this.deliverables[index];
  if (!deliverable) throw new Error("Deliverable not found");
  
  deliverable.status = 'approved';
  deliverable.approvedAt = new Date();
  
  await this.addActivity(
    'deliverable_approved',
    `Deliverable "${deliverable.description.substring(0, 50)}..." approved`,
    'client',
    performedByName,
    { deliverableIndex: index }
  );
  
  await this.save();
  return this;
};

// Reject deliverable (client action)
projectSchema.methods.rejectDeliverable = async function(index, reason, performedByName) {
  const deliverable = this.deliverables[index];
  if (!deliverable) throw new Error("Deliverable not found");
  
  deliverable.status = 'rejected';
  
  await this.addActivity(
    'deliverable_rejected',
    `Deliverable "${deliverable.description.substring(0, 50)}..." rejected: ${reason}`,
    'client',
    performedByName,
    { deliverableIndex: index, reason }
  );
  
  await this.save();
  return this;
};

//Get original deliverables only
projectSchema.methods.getOriginalDeliverables = function() {
  return this.deliverables.filter(d => d.deliverableType === 'original');
};

// Get extra deliverables only
projectSchema.methods.getExtraDeliverables = function() {
  return this.deliverables.filter(d => d.deliverableType === 'extra');
};