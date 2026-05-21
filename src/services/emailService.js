const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ================= PASSWORD RESET =================

const sendPasswordResetEmail = async (
  email,
  resetToken,
  userName
) => {

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped App",
      email: process.env.EMAIL
    },

    to: [
      {
        email
      }
    ],

    subject: "Password Reset Request",

    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <h2>Password Reset Request</h2>

        <p>Hello ${userName},</p>

        <p>You requested to reset your password.</p>

        <a
          href="${resetUrl}"
          style="
            display:inline-block;
            padding:12px 24px;
            background-color:#007bff;
            color:white;
            text-decoration:none;
            border-radius:4px;
            margin:20px 0;
          "
        >
          Reset Password
        </a>

        <p>Or copy and paste this link into your browser:</p>

        <p>${resetUrl}</p>

        <p>This link will expire in 30 minutes.</p>

        <p>If you didn't request this, please ignore this email.</p>

        <hr>

        <p style="color:#666;font-size:12px;">
          Stamped App - Secure Authentication
        </p>

      </div>
    `

  });

  console.log("PASSWORD RESET EMAIL:", response);
};

// ================= PASSWORD RESET SUCCESS =================

const sendPasswordResetSuccessEmail = async (
  email,
  userName
) => {

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped App",
      email: process.env.EMAIL
    },

    to: [
      {
        email
      }
    ],

    subject: "Password Reset Successful",

    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

        <h2>Password Reset Successful</h2>

        <p>Hello ${userName},</p>

        <p>Your password has been successfully reset.</p>

        <p>If you did not perform this action, please contact support immediately.</p>

        <hr>

        <p style="color:#666;font-size:12px;">
          Stamped App - Secure Authentication
        </p>

      </div>
    `

  });

  console.log("RESET SUCCESS EMAIL:", response);
};

// ================= PROJECT OTP =================

const sendConfirmationOTP = async (
  email,
  otp,
  projectName,
  clientName,
  freelancerName
) => {

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped",
      email: process.env.EMAIL
    },

    to: [
      {
        email
      }
    ],

    subject: `Confirm your project: ${projectName}`,

    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

        <div style="background-color:#6B46C1;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">Stamped</h1>
        </div>

        <div style="padding:20px;background-color:#f9f9f9;">

          <h2>Hello ${clientName},</h2>

          <p>
            <strong>${freelancerName}</strong> has shared a project with you:
            <strong>${projectName}</strong>
          </p>

          <p>Please use the verification code below:</p>

          <div style="text-align:center;margin:30px 0;">
            <div style="
              font-size:36px;
              font-weight:bold;
              letter-spacing:8px;
              color:#6B46C1;
              background:white;
              padding:15px;
              border-radius:8px;
              display:inline-block;
            ">
              ${otp}
            </div>
          </div>

          <p>This code will expire in <strong>10 minutes</strong>.</p>

        </div>

      </div>
    `

  });

  console.log("OTP EMAIL:", response);
};

// ================= CLIENT RECEIPT =================

const sendConfirmationReceipt = async (
  email,
  project,
  clientName
) => {

  const deliverablesList = project.deliverables.map(
    d => `
      <li>
        <strong>${d.item}</strong> -
        ${project.currency} ${d.amount.toLocaleString()}
      </li>
    `
  ).join('');

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped",
      email: process.env.EMAIL
    },

    to: [
      {
        email
      }
    ],

    subject: `Project Confirmed: ${project.projectName}`,

    htmlContent: `
      <div style="font-family: Arial, sans-serif;">

        <h2>Project Confirmation Receipt</h2>

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
    `

  });

  console.log("RECEIPT EMAIL:", response);
};

// ================= FREELANCER NOTIFICATION =================

const notifyFreelancerConfirmation = async (
  freelancerEmail,
  freelancerName,
  projectName,
  clientName
) => {

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped",
      email: process.env.EMAIL
    },

    to: [
      {
        email: freelancerEmail
      }
    ],

    subject: `Project Confirmed: ${projectName}`,

    htmlContent: `
      <div style="font-family: Arial, sans-serif;">

        <h2>Hello ${freelancerName},</h2>

        <p>
          <strong>${clientName}</strong> confirmed your project:
          <strong>${projectName}</strong>
        </p>

        <p>The project is now active.</p>

      </div>
    `

  });

  console.log("FREELANCER EMAIL:", response);
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

  const response = await apiInstance.sendTransacEmail({

    sender: {
      name: "Stamped",
      email: process.env.EMAIL
    },

    to: [
      {
        email: freelancerEmail
      }
    ],

    subject: `Revision Requested: ${deliverableName} - ${projectName}`,

    htmlContent: `
      <div style="font-family: Arial, sans-serif;">

        <h2>Hello ${freelancerName},</h2>

        <p>
          ${clientName} requested revisions on:
          <strong>${deliverableName}</strong>
        </p>

        <div style="
          background:#f4f4f4;
          padding:15px;
          border-radius:8px;
          margin:20px 0;
        ">
          ${revisionReason}
        </div>

        <a href="${process.env.FRONTEND_URL}/projects/${projectId}">
          View Project
        </a>

      </div>
    `

  });

  console.log("REVISION EMAIL:", response);
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendConfirmationOTP,
  sendConfirmationReceipt,
  notifyFreelancerConfirmation,
  sendRevisionRequestNotification
};