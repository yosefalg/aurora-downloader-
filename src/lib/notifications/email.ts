import nodemailer from 'nodemailer';
import { logger } from '@/lib/monitoring/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Aurora <noreply@aurora.app>',
      to,
      subject,
      html,
    });
    logger.info('Email sent', { to, subject });
  } catch (error) {
    logger.error('Email send failed', { error, to, subject });
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await sendEmail(
    email,
    'Welcome to Aurora!',
    `<h1>Welcome ${name}!</h1><p>Your account is ready. Start downloading now.</p>`
  );
}

export async function sendDownloadCompleteEmail(
  email: string,
  filename: string,
  downloadUrl: string
): Promise<void> {
  await sendEmail(
    email,
    'Your download is ready!',
    `<h1>Download Complete</h1><p>${filename} is ready.</p><a href="${downloadUrl}">Download Now</a>`
  );
}
