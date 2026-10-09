import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from '../types';

export const generateToken = (user: AuthUser): string => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    studentId: user.studentId,
    rollNumber: user.rollNumber,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
};

export const verifyToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthUser;
  } catch (error) {
    return null;
  }
};
