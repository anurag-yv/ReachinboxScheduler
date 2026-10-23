import nodemailer from 'nodemailer';

async function main() {
  console.log('Generating temporary test Ethereal SMTP account via Nodemailer...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('\n=============================================');
    console.log('Ethereal Test Account Created:');
    console.log('=============================================');
    console.log(`ETHEREAL_USER=${testAccount.user}`);
    console.log(`ETHEREAL_PASSWORD=${testAccount.pass}`);
    console.log(`ETHEREAL_HOST=${testAccount.smtp.host}`);
    console.log(`ETHEREAL_PORT=${testAccount.smtp.port}`);
    console.log('=============================================\n');
    console.log('Copy the values above into backend/.env to send real test emails.');
  } catch (err: any) {
    console.error('Failed to create Ethereal account:', err.message);
  }
}

main();
