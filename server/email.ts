import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set - email functionality disabled");
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
          body { 
            font-family: 'MS Sans Serif', sans-serif; 
            font-size: 11px;
            margin: 0; 
            padding: 20px;
            background: #008080;
            color: #000;
          }
          .window {
            max-width: 500px;
            margin: 0 auto;
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            box-shadow: 2px 2px 0px #000000;
          }
          .title-bar {
            background: linear-gradient(90deg, #0000ff 0%, #008080 100%);
            color: white;
            padding: 2px;
            font-weight: bold;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .title-bar-text {
            padding: 3px 6px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .title-bar-controls {
            display: flex;
            gap: 2px;
            padding-right: 2px;
          }
          .title-bar-button {
            width: 16px;
            height: 14px;
            background: #c0c0c0;
            border: 1px outset #c0c0c0;
            font-size: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: black;
            font-weight: bold;
          }
          .window-body {
            padding: 12px;
            background: #c0c0c0;
            line-height: 1.3;
          }
          .field-row {
            margin-bottom: 8px;
          }
          .button {
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            padding: 4px 12px;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
            text-decoration: none;
            color: black;
            display: inline-block;
            margin: 8px 0;
            cursor: pointer;
          }
          .button:hover {
            background: #d4d0c8;
          }
          .button:active {
            border: 2px inset #c0c0c0;
          }
          .textbox {
            background: white;
            border: 2px inset #c0c0c0;
            padding: 2px 4px;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
            word-break: break-all;
          }
          a {
            color: blue;
            text-decoration: underline;
          }
          .status-bar {
            background: #c0c0c0;
            border-top: 1px solid #808080;
            padding: 2px 6px;
            font-size: 10px;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="window">
          <div class="title-bar">
            <div class="title-bar-text">
              🎵 TreeNote - Team Invitation
            </div>
            <div class="title-bar-controls">
              <div class="title-bar-button">_</div>
              <div class="title-bar-button">□</div>
              <div class="title-bar-button">×</div>
            </div>
          </div>
          
          <div class="window-body">
            <div class="field-row">
              <strong>You've been invited to collaborate!</strong>
            </div>
            
            <div class="field-row">
              <strong>${inviterEmail}</strong> has invited you to join their team "<strong>${teamName}</strong>" on TreeNote.
            </div>
            
            <div class="field-row">
              TreeNote is a music collaboration platform that allows teams to comment on audio waveforms at specific timestamps, perfect for making notes at certain points of a song or podcast.
            </div>
            
            <div class="field-row" style="text-align: center; margin: 16px 0;">
              <a href="${inviteLink}" class="button">Accept Invitation & Join Team</a>
            </div>
            
            <div class="field-row">
              If the button doesn't work, copy and paste this link into your browser:
            </div>
            <div class="field-row">
              <div class="textbox" style="word-break: break-all; padding: 4px;">
                <a href="${inviteLink}">${inviteLink}</a>
              </div>
            </div>
            
            <div class="field-row" style="margin-top: 16px; font-size: 10px; color: #666;">
              This invitation was sent by TreeNote, a product by <a href="https://themeetingtree.com">The Meeting Tree</a>.
            </div>
            <div class="field-row" style="font-size: 10px; color: #666;">
              Audio files are automatically deleted after 21 days, but comments and waveforms remain available for collaboration!
            </div>
          </div>
          
          <div class="status-bar">
            Ready
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
          body { 
            font-family: 'MS Sans Serif', sans-serif; 
            font-size: 11px;
            margin: 0; 
            padding: 20px;
            background: #008080;
            color: #000;
          }
          .window {
            max-width: 500px;
            margin: 0 auto;
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            box-shadow: 2px 2px 0px #000000;
          }
          .title-bar {
            background: linear-gradient(90deg, #0000ff 0%, #008080 100%);
            color: white;
            padding: 2px;
            font-weight: bold;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .title-bar-text {
            padding: 3px 6px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .title-bar-controls {
            display: flex;
            gap: 2px;
            padding-right: 2px;
          }
          .title-bar-button {
            width: 16px;
            height: 14px;
            background: #c0c0c0;
            border: 1px outset #c0c0c0;
            font-size: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: black;
            font-weight: bold;
          }
          .window-body {
            padding: 12px;
            background: #c0c0c0;
            line-height: 1.3;
          }
          .field-row {
            margin-bottom: 8px;
          }
          .button {
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            padding: 4px 12px;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
            text-decoration: none;
            color: black;
            display: inline-block;
            margin: 8px 0;
            cursor: pointer;
          }
          .button:hover {
            background: #d4d0c8;
          }
          .button:active {
            border: 2px inset #c0c0c0;
          }
          .textbox {
            background: white;
            border: 2px inset #c0c0c0;
            padding: 4px;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
            word-break: break-all;
          }
          .comment-box {
            background: white;
            border: 2px inset #c0c0c0;
            padding: 6px;
            margin: 12px 0;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
          }
          .timestamp {
            font-weight: bold;
            color: #000080;
            margin-bottom: 4px;
          }
          a {
            color: blue;
            text-decoration: underline;
          }
          .status-bar {
            background: #c0c0c0;
            border-top: 1px solid #808080;
            padding: 2px 6px;
            font-size: 10px;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="window">
          <div class="title-bar">
            <div class="title-bar-text">
              💬 TreeNote - New Comment Alert
            </div>
            <div class="title-bar-controls">
              <div class="title-bar-button">_</div>
              <div class="title-bar-button">□</div>
              <div class="title-bar-button">×</div>
            </div>
          </div>
          
          <div class="window-body">
            <div class="field-row">
              <strong>Someone commented on your track!</strong>
            </div>
            
            <div class="field-row">
              <strong>${commenterName}</strong> left a comment on "<strong>${trackName}</strong>" at timestamp <strong>${timeString}</strong>.
            </div>
            
            <div class="comment-box">
              <div class="timestamp">At ${timeString}:</div>
              <div>"${commentText}"</div>
            </div>
            
            <div class="field-row" style="text-align: center; margin: 16px 0;">
              <a href="${trackUrl}" class="button">View Track & Comment</a>
            </div>
            
            <div class="field-row">
              If the button doesn't work, copy and paste this link into your browser:
            </div>
            <div class="field-row">
              <div class="textbox" style="word-break: break-all;">
                <a href="${trackUrl}">${trackUrl}</a>
              </div>
            </div>
            
            <div class="field-row" style="margin-top: 16px; font-size: 10px; color: #666;">
              This notification was sent by TreeNote, a product by <a href="https://themeetingtree.com">The Meeting Tree</a>.
            </div>
            <div class="field-row" style="font-size: 10px; color: #666;">
              Audio files are automatically deleted after 21 days, but comments and waveforms remain available for collaboration!
            </div>
          </div>
          
          <div class="status-bar">
            New comment notification
          </div>
        </div>
      </body>
      </html>
    `
  };
}