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

export type TimeRange = { start: string; end: string };
export type DayPlan = { enabled: boolean; ranges: TimeRange[] };
export type TimeOffEntry = { from: string; to: string; reason?: string };
export type DateOverride = { date: string; available: boolean; ranges: TimeRange[]; note?: string };

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
  /** Flexible week: each day on/off with any number of time ranges (gaps = breaks). Overrides workingHours when present. */
  weekly?: Partial<Record<DoctorScheduleDay, DayPlan>>;
  /** Whole days off (holiday, leave): inclusive YYYY-MM-DD range */
  timeOff?: TimeOffEntry[];
  /** One-off dates with their own hours, or marked unavailable */
  dateOverrides?: DateOverride[];
  /** Gap kept between consultations */
  bufferMinutes?: number;
  /** Patients cannot book slots starting sooner than this */
  minNoticeHours?: number;
  /** How far ahead patients can book */
  maxAdvanceDays?: number;
  /** Cap on consultations per day (0 = no cap) */
  maxPerDay?: number;
  /** "I am not available": stops new bookings until resumed (or until pausedUntil) */
  paused?: boolean;
  pausedUntil?: Date | null;
  pauseMessage?: string;
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
    weekly: { type: mongoose.Schema.Types.Mixed },
    timeOff: [{ _id: false, from: String, to: String, reason: String }],
    dateOverrides: [{ _id: false, date: String, available: Boolean, ranges: [{ _id: false, start: String, end: String }], note: String }],
    bufferMinutes: { type: Number, default: 0, min: 0, max: 120 },
    minNoticeHours: { type: Number, default: 0, min: 0, max: 720 },
    maxAdvanceDays: { type: Number, default: 90, min: 1, max: 730 },
    maxPerDay: { type: Number, default: 0, min: 0, max: 200 },
    paused: { type: Boolean, default: false },
    pausedUntil: { type: Date, default: null },
    pauseMessage: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

export default mongoose.models.DoctorSchedule ||
  mongoose.model<IDoctorSchedule>('DoctorSchedule', doctorScheduleSchema);
