import mongoose from 'mongoose';

/** Single-document settings for the "My AI Doctor" video consultation. */
const schema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    enabled: { type: Boolean, default: false },
    /** URL of the doctor's 3D avatar (.glb with ARKit + Oculus viseme blendshapes). Male doctor. */
    avatarUrl: { type: String, default: '' },
    doctorName: { type: String, default: 'Qwesi AI Doctor' },
    cameraEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

export default mongoose.models.AiDoctorSettings || mongoose.model('AiDoctorSettings', schema);
