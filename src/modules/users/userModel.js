const mongoose = require("mongoose");
const validator = require("validator");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name required'],
      trim: true,
      minlength: [2, 'First name is required'],
      maxlength: [15, 'First name cannot exceed 15 characters']
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [15, 'Last name cannot exceed 15 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Please provide a valid email address'
      }
    },

    password: {
      type: String,
     required: function() { 
  return this.provider === 'local' || !this.googleId; 
},
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },

    googleId: {
  type: String,
  unique: true,
  sparse: true,
},

    emailVerified: {
      type: Boolean,
      default: false
    },

    provider: {
  type: String,
  enum: ['local', 'google'],
  default: 'local',
  required: true
}, 
role: {
      type: String,
      enum: ['freelancer', 'client'],
      default: 'freelancer'
    },

    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
    
  },
  { timestamps: true }
);

userSchema.index({role: 1, createdAt: -1 });
userSchema.index({ provider: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", function () {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase().trim();
  }
});

module.exports = mongoose.model("User", userSchema);