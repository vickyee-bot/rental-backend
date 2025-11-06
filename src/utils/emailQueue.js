// utils/emailQueue.js
class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  add(email, token, fullName, type = "verification") {
    this.queue.push({ email, token, fullName, type });
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      await emailService.sendVerificationEmail(
        job.email,
        job.token,
        job.fullName
      );
      console.log("✅ Queue: Email sent successfully");
    } catch (error) {
      console.error("❌ Queue: Email failed:", error.message);
    } finally {
      this.isProcessing = false;
      this.process(); // Process next job
    }
  }
}

module.exports = new EmailQueue();
