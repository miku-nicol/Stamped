const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND);

// ================= PASSWORD RESET =================

const sendPasswordResetEmail = async (
  email,
  resetToken,
  userName
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>

        <p>Hello ${userName},</p>

        <p>You requested to reset your password.</p>

        <a 
          href="${resetUrl}" 
          style="display:inline-block;padding:12px 24px;background:#6B46C1;color:white;text-decoration:none;border-radius:6px;"
        >
          Reset Password
        </a>

        <p style="margin-top:20px;">
          Or copy this link:
        </p>

        <p>${resetUrl}</p>

        <p>This link expires in 30 minutes.</p>

        <hr />

        <p style="font-size:12px;color:#666;">
          Stamped App
        </p>
      </div>
    `,
  });
};

const sendPasswordResetSuccessEmail = async (
  email,
  userName
) => {
  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: email,
    subject: "Password Reset Successful",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset Successful</h2>

        <p>Hello ${userName},</p>

        <p>Your password has been reset successfully.</p>
      </div>
    `,
  });
};

// ================= PROJECT OTP =================

const sendConfirmationOTP = async (
  email,
  otp,
  projectName,
  clientName,
  freelancerName
) => {
  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: email,
    subject: `Confirm your project: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <h1 style="color:#6B46C1;">Stamped</h1>

        <h2>Hello ${clientName},</h2>

        <p>
          <strong>${freelancerName}</strong> shared a project with you:
          <strong>${projectName}</strong>
        </p>

        <p>Your verification code:</p>

        <div style="
          font-size:36px;
          font-weight:bold;
          letter-spacing:8px;
          color:#6B46C1;
          padding:20px;
          background:#f4f4f4;
          border-radius:8px;
          text-align:center;
        ">
          ${otp}
        </div>

        <p style="margin-top:20px;">
          This code expires in 10 minutes.
        </p>
      </div>
    `,
  });
};

// ================= CLIENT CONFIRMATION =================

const sendConfirmationReceipt = async (
  email,
  project,
  clientName
) => {
  const deliverablesList = project.deliverables
    .map(
      d => `
        <li>
          <strong>${d.item}</strong> -
          ${project.currency} ${d.amount.toLocaleString()}
        </li>
      `
    )
    .join("");

  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: email,
    subject: `Project Confirmed: ${project.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        
        <h1 style="color:#6B46C1;">Project Confirmed</h1>

        <p>Hello ${clientName},</p>

        <p>
          You confirmed the project:
          <strong>${project.projectName}</strong>
        </p>

        <ul>
          ${deliverablesList}
        </ul>

        <p>
          Total Amount:
          <strong>
            ${project.currency} ${project.totalAmount.toLocaleString()}
          </strong>
        </p>
      </div>
    `,
  });
};

// ================= FREELANCER NOTIFICATION =================

const notifyFreelancerConfirmation = async (
  freelancerEmail,
  freelancerName,
  projectName,
  clientName
) => {
  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: freelancerEmail,
    subject: `Project Confirmed: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        
        <h2>Hello ${freelancerName},</h2>

        <p>
          ${clientName} confirmed your project:
          <strong>${projectName}</strong>
        </p>

        <p>The project is now active.</p>
      </div>
    `,
  });
};

// ================= REVISION REQUEST =================

const sendRevisionRequestNotification = async (
  freelancerEmail,
  freelancerName,
  projectName,
  deliverableName,
  revisionReason,
  projectId,
  clientName
) => {
  await resend.emails.send({
    from: "Stamped <onboarding@resend.dev>",
    to: freelancerEmail,
    subject: `Revision Requested: ${deliverableName}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        
        <h2>Hello ${freelancerName},</h2>

        <p>
          ${clientName} requested revisions for:
          <strong>${deliverableName}</strong>
        </p>

        <div style="
          background:#f4f4f4;
          padding:15px;
          border-radius:8px;
        ">
          ${revisionReason}
        </div>

        <p style="margin-top:20px;">
          Open project:
        </p>

        <a href="${process.env.FRONTEND_URL}/projects/${projectId}">
          View Project
        </a>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendConfirmationOTP,
  sendConfirmationReceipt,
  notifyFreelancerConfirmation,
  sendRevisionRequestNotification,
};