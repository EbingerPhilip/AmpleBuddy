import { previewRepository } from "../repository/previewRepository";

class PreviewService {
  async loadMinimalChatPreviewsForUser(userId: number): Promise<any[]> {
    return previewRepository.loadChatPreviewsForUserMinimal(userId);
  }

  async loadMinimalGroupChatPreviewsForUser(userId: number): Promise<any[]> {
    return previewRepository.loadGroupChatPreviewsForUserMinmal(userId);
  }

  async loadAllChatPreviewsForUser(userId: number, group?: boolean): Promise<any[]> {
    if (group === true) {
      return previewRepository.loadGroupChatOnlyPreviewsForUser(userId);
    } else if (group === false) {
      return previewRepository.loadChatOnlyPreviewsForUser(userId);
    }
    // Load all chats if group is not specified
    return previewRepository.loadAllChatPreviewsForUser(userId);
  }
}

export const previewService = new PreviewService();