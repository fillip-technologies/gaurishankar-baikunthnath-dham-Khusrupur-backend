import mongoose from "mongoose";
 

const prasadSchema = new mongoose.Schema({
    prasadName : {
        type: String,
        required: true,
        trim: true,
    },
    priceperkg: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        trim: true,
    }
}, {timestamps: true})

export const Prasad = mongoose.model("Prasad", prasadSchema);