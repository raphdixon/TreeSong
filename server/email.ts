import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Use the user's email from environment or a default that should work with SendGrid
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'test@example.com';

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    const msg = {
      to: template.to,
      from: FROM_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text || template.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${template.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function createTeamInviteEmail(
  inviterEmail: string, 
  teamName: string, 
  inviteToken: string,
  baseUrl: string
): EmailTemplate {
  const inviteLink = `${baseUrl}/register?invite=${inviteToken}`;
  
  return {
    to: '', // Will be set when sending
    subject: `You've been invited to join ${teamName} on TreeNote`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TreeNote Team Invite</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 TreeNote Team Invitation</h1>
          </div>
          <div class="content">
            <h2>You've been invited to collaborate!</h2>
            <p><strong>${inviterEmail}</strong> has invited you to join their team "<strong>${teamName}</strong>" on TreeNote.</p>
            
            <p>TreeNote is a music collaboration platform that allows teams to comment on audio waveforms at specific timestamps, perfect for making notes at certain points of a song or podcast.</p>
            
            <a href="${inviteLink}" class="button">Accept Invitation & Join Team</a>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${inviteLink}">${inviteLink}</a></p>
            
            <div class="footer">
              <p>This invitation was sent by TreeNote, a product by <a href="https://themeetingtree.com">The Meeting Tree</a>.</p>
              <p>Your files will be deleted after 10 days, so please make note of any important comments!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

export function createCommentNotificationEmail(
  trackName: string,
  commenterName: string,
  commentText: string,
  timestamp: number,
  trackUrl: string
): EmailTemplate {
  const minutes = Math.floor(timestamp / 60);
  const seconds = Math.floor(timestamp % 60);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return {
    to: '', // Will be set when sending
    subject: `New comment on "${trackName}" - TreeNote`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Comment - TreeNote</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .comment-box { background: white; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
          .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .timestamp { color: #666; font-size: 14px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 New Comment on TreeNote</h1>
          </div>
          <div class="content">
            <h2>Someone commented on your track!</h2>
            <p><strong>${commenterName}</strong> left a comment on "<strong>${trackName}</strong>" at timestamp <strong>${timeString}</strong>.</p>
            
            <div class="comment-box">
              <div class="timestamp">At ${timeString}:</div>
              <p>"${commentText}"</p>
            </div>
            
            <a href="${trackUrl}" class="button">View Track & Comment</a>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${trackUrl}">${trackUrl}</a></p>
            
            <div class="footer">
              <p>This notification was sent by TreeNote, a product by <a href="https://themeetingtree.com">The Meeting Tree</a>.</p>
              <p>Your files will be deleted after 10 days, so please make note of any important comments!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
}