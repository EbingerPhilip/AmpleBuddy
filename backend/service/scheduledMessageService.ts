import { scheduledMessageRepository } from "../repository/scheduledMessageRepository";

type Trigger = 'Red Day' | 'Yellow Day' | 'Date';

class ScheduledMessageService {
  private validateText(text: string): void {
    if (!text || !text.trim()) throw new Error("Message text is required");
    if (text.length > 2000) throw new Error("Message text too long");
  }

  private validateTrigger(trigger: Trigger, duedate: Date | null): void {
    const colorTriggers: Trigger[] = ['Red Day', 'Yellow Day'];
    const isColorTrigger = colorTriggers.includes(trigger);

    // Color-Trigger does not allow duedate
    if (isColorTrigger && duedate) {
      throw new Error("Color triggers ('Red Day', 'Yellow Day') cannot have a due date");
    }

    // Date-Trigger requires duedate
    if (trigger === 'Date' && !duedate) {
      throw new Error("Due date is required for 'Date' trigger");
    }

    // Date-Trigger requires duedate to be in the future
    if (trigger === 'Date' && duedate) {
      const now = new Date();
      if (duedate <= now) {
        throw new Error("Due date must be in the future");
      }
    }
  }

  async sendScheduledMessage(
    userId: number,
    text: string,
    trigger: Trigger,
    duedate: Date | null
  ): Promise<number> {
    this.validateText(text);
    this.validateTrigger(trigger, duedate);
    return await scheduledMessageRepository.createScheduledMessage(userId, text, trigger, duedate);
  }

  async getScheduledMessage(messageId: number): Promise<any> {
    const message = await scheduledMessageRepository.getScheduledMessageById(messageId);
    if (!message) throw new Error("Scheduled message not found");
    return message;
  }

  async getUserScheduledMessages(userId: number): Promise<any[]> {
    return await scheduledMessageRepository.getScheduledMessagesByUserId(userId);
  }

  async updateScheduledMessage(
    messageId: number,
    text: string,
    trigger: Trigger,
    duedate: Date | null
  ): Promise<void> {
    this.validateText(text);
    this.validateTrigger(trigger, duedate);
    const existing = await scheduledMessageRepository.getScheduledMessageById(messageId);
    if (!existing) throw new Error("Scheduled message not found");
    
    await scheduledMessageRepository.updateScheduledMessage(messageId, text, trigger, duedate);
  }

  async deleteScheduledMessage(messageId: number): Promise<void> {
    const existing = await scheduledMessageRepository.getScheduledMessageById(messageId);
    if (!existing) throw new Error("Scheduled message not found");
    
    await scheduledMessageRepository.deleteScheduledMessage(messageId);
  }
}

export const scheduledMessageService = new ScheduledMessageService();