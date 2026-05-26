import mongoose from 'mongoose';

const DAY_ENUM = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DoctorScheduleDay = (typeof DAY_ENUM)[number];

export interface IDoctorSchedule {
  _id: string;
  doctorId: mongoose.Types.ObjectId;
  slotDurationMinutes: number;
  websiteBookingEnabled: boolean;
  workingHours: {
    start: string;
    end: string;
    days: DoctorScheduleDay[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const doctorScheduleSchema = new mongoose.Schema<IDoctorSchedule>(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 180,
    },
    websiteBookingEnabled: {
      type: Boolean,
      default: true,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      days: [
        {
          type: String,
          enum: DAY_ENUM,
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.models.DoctorSchedule ||
  mongoose.model<IDoctorSchedule>('DoctorSchedule', doctorScheduleSchema);
