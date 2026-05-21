const nodemailer = require('nodemailer')

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN,
    pass: process.env.BREVO_SMTP_KEY
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendPasswordResetEmail = async (email, resetToken, userName) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Stamped App" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                    Reset Password
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 30 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Stamped App - Secure Authentication</p>
            </div>
        `,
        text: `
            Password Reset Request
            Hello ${userName},
            
            You requested to reset your password. Click the link below to reset it:
            ${resetUrl}
            
            This link will expire in 1 hour.
            
            If you didn't request this, please ignore this email.
            
            Stamped App - Secure Authentication
        `
    };
    
    await transporter.sendMail(mailOptions);
};

const sendPasswordResetSuccessEmail = async (email, userName) => {
    const mailOptions = {
        from: `"Stamped App" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Password Reset Successful',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Successful</h2>
                <p>Hello ${userName},</p>
                <p>Your password has been successfully reset.</p>
                <p>If you did not perform this action, please contact support immediately.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Stamped App - Secure Authentication</p>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

const sendConfirmationOTP = async (email, otp, projectName, clientName, freelancerName) => {
  const mailOptions = {
    from: `"Stamped" <${process.env.EMAIL}>`,
    to: email,
    subject: `Confirm your project: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6B46C1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Stamped</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hello ${clientName},</h2>
          
          <p><strong>${freelancerName}</strong> has shared a project with you: <strong>${projectName}</strong></p>
          
          <p>Please use the verification code below to confirm your agreement:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6B46C1; background: white; padding: 15px; border-radius: 8px; display: inline-block;">
              ${otp}
            </div>
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          
          <p>If you didn't expect this, please ignore this email.</p>
          
          <hr style="margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Stamped helps freelancers and clients track project agreements, deliverables, and approvals.
          </p>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};


const sendConfirmationReceipt = async (email, project, clientName) => {
  const deliverablesList = project.deliverables.map(d => 
    `<li><strong>${d.item}</strong> - ${project.currency} ${d.amount.toLocaleString()}</li>`
  ).join('');
  
  const mailOptions = {
    from: `"Stamped" <${process.env.EMAIL}>`,
    to: email,
    subject: `Project Confirmed: ${project.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6B46C1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Stamped</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Project Confirmation Receipt</h2>
          
          <p>Dear ${clientName},</p>
          
          <p>You have successfully confirmed the following project with <strong>${project.freelancerName}</strong>:</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${project.projectName}</h3>
            <p><strong>Confirmed on:</strong> ${new Date(project.clientConfirmedAt).toLocaleString()}</p>
            <p><strong>Total Amount:</strong> ${project.currency} ${project.totalAmount.toLocaleString()}</p>
            <p><strong>Due Date:</strong> ${new Date(project.dueDate).toLocaleDateString()}</p>
            
            <h4>Deliverables:</h4>
            <ul>${deliverablesList}</ul>
          </div>
          
          <p>You can track the progress of this project using the same link: <br/>
          <a href="${process.env.FRONTEND_URL}/client/project/${project.clientLinkToken}" style="color: #6B46C1;">View Project</a></p>
          
          <hr style="margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Stamped helps freelancers and clients track project agreements, deliverables, and approvals.
          </p>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};


const notifyFreelancerConfirmation = async (freelancerEmail, freelancerName, projectName, clientName) => {
  const mailOptions = {
    from: `"Stamped" <${process.env.EMAIL}>`,
    to: freelancerEmail,
    subject: `Project Confirmed: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6B46C1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Stamped</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Great news, ${freelancerName}!</h2>
          
          <p><strong>${clientName}</strong> has confirmed the project: <strong>${projectName}</strong></p>
          
          <p>The project terms are now locked and the project is active.</p>
          
          <p>You can now start submitting deliverables for client approval.</p>
          
          <a href="${process.env.FRONTEND_URL}/projects" style="display: inline-block; padding: 12px 24px; background-color: #6B46C1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Go to Project
          </a>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

const sendRevisionRequestNotification = async (freelancerEmail, freelancerName, projectName, deliverableName, revisionReason, projectId, clientName) => {
  const mailOptions = {
    from: `"Stamped" <${process.env.EMAIL}>`,
    to: freelancerEmail,
    subject: `Revision Requested: ${deliverableName} - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6B46C1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Stamped</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hello ${freelancerName},</h2>
          
          <p><strong>${clientName}</strong> has requested revisions on <strong>"${deliverableName}"</strong> for project <strong>${projectName}</strong>.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6B46C1;">
            <h3 style="margin-top: 0; color: #6B46C1;">Revision Notes:</h3>
            <p style="margin-bottom: 0;">${revisionReason}</p>
          </div>
          
          <p>Please review the feedback and submit an updated version of this deliverable.</p>
          
          <a href="${process.env.FRONTEND_URL}/projects/${projectId}" style="display: inline-block; padding: 12px 24px; background-color: #6B46C1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            View Project & Make Revisions
          </a>
          
          <p>You can resubmit the revised deliverable through the project page.</p>
          
          <hr style="margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Stamped helps freelancers and clients track project agreements, deliverables, and approvals.
          </p>
        </div>
      </div>
    `,
    text: `
      Hello ${freelancerName},
      
      ${clientName} has requested revisions on "${deliverableName}" for project "${projectName}".
      
      Revision Notes:
      ${revisionReason}
      
      Please review the feedback and submit an updated version of this deliverable.
      
      View the project at: ${process.env.FRONTEND_URL}/projects/${projectId}
      
      ---
      Stamped helps freelancers and clients track project agreements, deliverables, and approvals.
    `
  };
  
  await transporter.sendMail(mailOptions);
};


module.exports = { sendPasswordResetEmail, 
    sendPasswordResetSuccessEmail,
    sendConfirmationOTP,
    sendConfirmationReceipt,
    notifyFreelancerConfirmation,
    sendRevisionRequestNotification
 };