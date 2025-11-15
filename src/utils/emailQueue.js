// utils/emailQueue.js
const emailService = require("./emailService");

class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
  }

  add(email, token, fullName, type = "verification") {
    this.queue.push({
      email,
      token,
      fullName,
      type,
      retries: 0,
    });
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue[0]; // Peek at first job

    try {
      console.log(`📧 Processing ${job.type} email for: ${job.email}`);

      let result;
      if (job.type === "verification") {
        result = await emailService.sendVerificationEmail(
          job.email,
          job.token,
          job.fullName
        );
      } else if (job.type === "passwordReset") {
        result = await emailService.sendPasswordResetEmail(
          job.email,
          job.token,
          job.fullName
        );
      } else if (job.type === "passwordChanged") {
        result = await emailService.sendPasswordChangedEmail(
          job.email,
          job.fullName
        );
      }

      if (result.success) {
        console.log(`✅ ${job.type} email sent to ${job.email}`);
        this.queue.shift(); // Remove successful job
      } else {
        throw new Error(result.error || "Email sending failed");
      }
    } catch (error) {
      console.error(`❌ Email failed for ${job.email}:`, error.message);

      job.retries++;

      if (job.retries >= this.maxRetries) {
        console.error(
          `💥 Max retries exceeded for ${job.email}, removing from queue`
        );
        this.queue.shift(); // Remove failed job after max retries
      } else {
        console.log(
          `🔄 Retrying ${job.email} (attempt ${job.retries + 1}/${
            this.maxRetries
          })`
        );
        // Move failed job to end of queue for retry
        this.queue.push(this.queue.shift());
      }
    } finally {
      this.isProcessing = false;

      // Process next job if any
      if (this.queue.length > 0) {
        setImmediate(() => this.process());
      }
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
  }
}

module.exports = new EmailQueue();
