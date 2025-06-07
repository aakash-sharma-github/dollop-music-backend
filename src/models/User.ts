import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    preferences?: {
        theme?: "light" | "dark";
        language?: string;
        notifications?: boolean;
    };
    generateAuthToken: () => string;
    generateRefreshToken: () => string;
}

const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            minlength: [3, "Username must be at least 3 characters long"],
            maxlength: [30, "Username cannot exceed 30 characters"]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"]
        },
        preferences: {
            theme: {
                type: String,
                enum: ["light", "dark"],
                default: "light"
            },
            language: {
                type: String,
                default: "en"
            },
            notifications: {
                type: Boolean,
                default: true
            }
        }
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Method to generate JWT auth token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign({ userId: this._id }, String(env.JWT_SECRET), {
        expiresIn: env.JWT_EXPIRES_IN
    });
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ userId: this._id }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN
    });
};

export const User = mongoose.model<IUser>("User", userSchema);
