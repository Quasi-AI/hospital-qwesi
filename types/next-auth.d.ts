import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    hasImage?: boolean;
    hasLicenseCertificate?: boolean;
    hasLicenseNumber?: boolean;
    approvalStatus?: string;
  }
  
  interface Session {
    user: {
      id?: string;
      email?: string;
      name?: string;
      role?: string;
      image?: string;
      hasImage?: boolean;
      hasLicenseCertificate?: boolean;
      hasLicenseNumber?: boolean;
      approvalStatus?: string;
      patientId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    image?: string;
    hasImage?: boolean;
    hasLicenseCertificate?: boolean;
    hasLicenseNumber?: boolean;
    approvalStatus?: string;
    patientId?: string;
  }
}
