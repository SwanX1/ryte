import type { Request, Response } from 'express';
import { UserModel, type User } from '../models/User';
import z from 'zod';
import { prettifyZodError } from '../util/zod';
import { AuditLogModel } from '../models/AuditLog';
import nodemailer from 'nodemailer';

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const { username, email, password } = z.object({
        username: z.string().min(3).max(20).trim().regex(/^[a-z0-9_.]+$/i),
        email: z.string().email().trim(),
        password: z.string().min(8).trim()
      }).parse(req.body);

      if (await UserModel.findByUsername(username)) {
        return res.status(400).render('auth/signup', {
          error: 'Username already exists'
        });
      }

      if (await UserModel.findByEmail(email)) {
        return res.status(400).render('auth/signup', {
          error: 'Email already registered'
        });
      }

      const user = await UserModel.create(username, email, password);
      if (!user) {
        return res.status(500).render('auth/signup', {
          error: 'Error creating user'
        });
      }
      
      // Set user session
      if (req.session) {
        req.session.userId = user.id;
      }

      AuditLogModel.create('signup', 'user', user.id, null, `User ${user.username} registered`);
      AuditLogModel.create('login', 'user', user.id, null, `User ${user.username} logged in`);
      sendVerificationEmail(user); // Don't await, since sending the email may take a while
      res.redirect('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('auth/signup', {
          error: prettifyZodError(error)
        });
      }

      console.error('Signup error:', error);
      res.status(500).render('auth/signup', {
        error: 'An error occurred during signup'
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty()
      }).parse(req.body);

      if (!username || !password) {
        return res.status(400).render('auth/login', {
          error: 'Username and password are required'
        });
      }

      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(400).render('auth/login', {
          error: 'Invalid username or password'
        });
      }

      const isValidPassword = await UserModel.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(400).render('auth/login', {
          error: 'Invalid username or password'
        });
      }

      // Set user session
      if (req.session) {
        req.session.userId = user.id;
      }
      AuditLogModel.create('login', 'user', user.id, null, `User ${user.username} logged in`);
      res.redirect('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('auth/login', {
          error: prettifyZodError(error)
        });
      }

      console.error('Login error:', error);
      res.status(500).render('auth/login', {
        error: 'An error occurred during login'
      });
    }
  }

  static logout(req: Request, res: Response) {
    if (req.session) {
      AuditLogModel.create('logout', 'user', req.session.userId, null, `User ${req.session.userId} logged out`);
      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).send('Error logging out');
        }
        res.redirect('/auth/login');
      });
    } else {
      res.redirect('/auth/login');
    }
  }

  static getSignupPage(req: Request, res: Response) {
    res.render('auth/signup', { error: null });
  }

  static getLoginPage(req: Request, res: Response) {
    res.render('auth/login', { error: null });
  }

  static async getVerifyEmailPage(req: Request, res: Response) {
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login');
    }

    const user = await UserModel.findById(req.session.userId);
    if (!user) {
      throw new Error('User not found???');
    }

    if (user.email_verified) {
      return res.redirect('/');
    }

    res.render('auth/verify-email', { error: null, success: null });
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      if (!req.session || !req.session.userId) {
        return res.redirect('/auth/login');
      }

      const { code } = z.object({
        code: z.string().nonempty()
      }).parse(req.body);

      const user = await UserModel.findById(req.session.userId);
      if (!user) {
        return res.status(500).render('auth/verify-email', { // 500, because this is a server error, not a user error
          error: 'User not found', 
          success: null 
        });
      }
      
      if (user.email_verified) {
        return res.redirect('/');
      }

      const isVerified = await UserModel.verifyEmail(user.id, code);
      if (isVerified) {
        AuditLogModel.create('email_verification', 'user', user.id, null, `User ${user.username} verified email`);
        return res.redirect('/');
      } else {
        return res.render('auth/verify-email', { 
          error: 'Invalid verification code', 
          success: null 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.render('auth/verify-email', { 
          error: 'Verification code is required', 
          success: null 
        });
      }

      console.error('Email verification error:', error);
      return res.render('auth/verify-email', { 
        error: 'An error occurred during verification', 
        success: null 
      });
    }
  }

  static async resendVerificationEmail(req: Request, res: Response) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      const user = await UserModel.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (user.email_verified) {
        return res.status(400).json({ success: false, message: 'Email already verified' });
      }
      // Send verification email
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        await sendVerificationEmail(user); // Await here, since the user has specifically requested a new verification email
        return res.json({ success: true });
      } catch (emailErr) {
        console.error('Verification email error:', emailErr);
        return res.status(500).json({ success: false, message: 'Failed to send verification email' });
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
} 

async function sendVerificationEmail(user: User) {
  // Send verification email
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from: `Ryte <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Verify your email',
      text: `Welcome to Ryte, ${user.username}!`,
      html: `<p>Welcome to Ryte, <b>${user.username}</b>! Please verify your email address. Your verification code is: <strong>${user.verification_code}</strong></p>`
    });
  } catch (emailErr) {
    console.error('Verification email error:', emailErr);
    // Do not expose email errors to user
  }
}
