// utils/emailQueue.js
class EmailQueue {
  constructor(maxRetries = 3, retryDelay = 5000) {
    this.queue = [];
    this.isProcessing = false;
    this.maxRetries = maxRetries; // Max attempts per email
    this.retryDelay = retryDelay; // Delay between retries in ms
  }

  add(email, token, fullName, type = "verification") {
    // Each job keeps track of its attempt count
    this.queue.push({ email, token, fullName, type, attempts: 0 });
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      switch (job.type) {
        case "verification":
          await emailService.sendVerificationEmail(
            job.email,
            job.token,
            job.fullName
          );
          break;
        case "reset":
          await emailService.sendPasswordResetEmail(
            job.email,
            job.token,
            job.fullName
          );
          break;
        case "changed":
          await emailService.sendPasswordChangedEmail(job.email, job.fullName);
          break;
        default:
          console.warn(`Unknown email type: ${job.type}`);
      }
      console.log(`✅ Email sent successfully to ${job.email} (${job.type})`);
    } catch (error) {
      job.attempts++;
      console.error(
        `❌ Failed to send email to ${job.email} (${job.type}), attempt ${job.attempts}:`,
        error.message
      );

      if (job.attempts < this.maxRetries) {
        console.log(`🔄 Retrying in ${this.retryDelay / 1000} seconds...`);
        setTimeout(
          () => this.queue.unshift(job) && this.process(),
          this.retryDelay
        );
      } else {
        console.error(`❌ Max retries reached. Email to ${job.email} dropped.`);
      }
    } finally {
      this.isProcessing = false;
      // Continue processing next job
      if (this.queue.length > 0) this.process();
    }
  }
}

module.exports = new EmailQueue();
