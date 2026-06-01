import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '../../../../lib/mongodb-adapter';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Patient from '../../../../models/Patient';
import bcrypt from 'bcryptjs';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';

/** Demo/staff emails must authenticate via User, not Patient — avoids wrong portal when DB is mis-seeded */
const USER_ONLY_EMAILS = new Set([
  'admin@aidoc.com',
  'doctor@aidoc.com',
  'staff@aidoc.com',
  'hospital@aidoc.com',
  'pharmacy@aidoc.com',
]);

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        try {
          await dbConnect();
          
          // First check User model (admin, doctor, staff) — normalized email matches schema lowercase
          let user = await User.findOne({ email });
          
          if (user) {
            // Check password for User accounts - password is required
            if (!user.password) {
              // Users without passwords cannot login
              return null;
            }
            
              const isValidPassword = await bcrypt.compare(credentials.password, user.password);
              if (isValidPassword) {
                const role = (user.role || 'doctor').toString().toLowerCase();
                const safeRole = ['admin', 'doctor', 'staff', 'nurse', 'patient', 'pharmacy', 'hospital'].includes(role)
                  ? role
                  : 'doctor';
                const approvalStatus = getEffectiveProviderApprovalStatus(user);
                const linkedPatient = safeRole === 'patient'
                  ? await Patient.findOne({ email }).select('patientId approvalStatus').lean() as any
                  : null;
                if (safeRole === 'patient' && linkedPatient?.approvalStatus && linkedPatient.approvalStatus !== 'approved') {
                  return null;
                }
                return {
                  id: user._id.toString(),
                  email: user.email,
                  name: user.name,
                  role: safeRole,
                  image: '',
                  hasImage: Boolean(user.image || user.hasImage),
                  hasLicenseCertificate: Boolean(user.licenseCertificate?.data || user.licenseCertificate?.fileName),
                  hasLicenseNumber: Boolean(user.licenseNumber?.trim()),
                  approvalStatus,
                  patientId: linkedPatient?.patientId,
                };
            }
            return null;
          }

          // If not found in User, check Patient model
          const patient = await Patient.findOne({ email });

          if (patient && USER_ONLY_EMAILS.has(email)) {
            console.warn(
              `[auth] ${email} is reserved for staff; use User account. If login fails, run: npx tsx scripts/fix-admin-account.ts`
            );
            return null;
          }

          if (patient) {
            // Check password for Patient accounts - password is required
            if (!patient.password) {
              // Patients without passwords cannot login
              return null;
            }
            
              const isValidPassword = await bcrypt.compare(credentials.password, patient.password);
              if (isValidPassword) {
                if (patient.approvalStatus && patient.approvalStatus !== 'approved') {
                  return null;
                }
                return {
                  id: patient._id.toString(),
                  email: patient.email,
                  name: patient.name,
                  role: 'patient',
                  image: null,
                  patientId: patient.patientId,
                  approvalStatus: patient.approvalStatus || 'approved',
                };
            }
            return null;
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.image = '';
        token.hasImage = Boolean(user.hasImage || user.image);
        token.hasLicenseCertificate = Boolean(user.hasLicenseCertificate);
        token.hasLicenseNumber = Boolean(user.hasLicenseNumber);
        token.approvalStatus = user.approvalStatus || 'approved';
        if (user.patientId) {
          token.patientId = user.patientId;
        }
      }
      if (trigger === 'update' && session?.user) {
        token.name = session.user.name ?? token.name;
        token.email = session.user.email ?? token.email;
        token.image = '';
        token.hasImage = Boolean(session.user.hasImage ?? token.hasImage);
        token.hasLicenseCertificate = Boolean(session.user.hasLicenseCertificate ?? token.hasLicenseCertificate);
        token.hasLicenseNumber = Boolean(session.user.hasLicenseNumber ?? token.hasLicenseNumber);
        token.approvalStatus = session.user.approvalStatus ?? token.approvalStatus;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.image = token.image as string;
        session.user.hasImage = Boolean(token.hasImage);
        session.user.hasLicenseCertificate = Boolean(token.hasLicenseCertificate);
        session.user.hasLicenseNumber = Boolean(token.hasLicenseNumber);
        session.user.approvalStatus = token.approvalStatus as string;
        if (token.patientId) {
          session.user.patientId = token.patientId as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
