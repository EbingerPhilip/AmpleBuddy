import { groupChatRepository } from "../repository/groupChatRepository";
import { chatService } from "./chatService";
import { GroupChat } from "../modules/groupChat";

class GroupChatService {
  async createGroupChat(
    members: number[],
    groupname: string,
    currentUserId: number
  ): Promise<number> {
    if (!members.includes(currentUserId)) {
      throw new Error("Current user must be part of the group chat");
    }

    if (members.length < 2) {
      throw new Error("Group chat must have at least 2 members");
    }

    if (!groupname || groupname.trim().length === 0) {
      throw new Error("Group name is required");
    }

    return groupChatRepository.createGroupChat(members, groupname, currentUserId);
  }

  async renameGroupChatById(chatId: number, currentUserId: number, newGroupName: string): Promise<void> {
     const existing = await groupChatRepository.getGroupChatById(chatId);
        if (!existing) throw new Error("Group chat not found");

         const admin = await groupChatRepository.getGroupChatAdmin(chatId);

        if (admin !== currentUserId) {
        throw new Error("Only the group admin can rename the group chat");
        }
        await groupChatRepository.updateGroupChatName(chatId, newGroupName);

  }

  async getGroupChatById(chatId: number): Promise<GroupChat> {
    const chatData = await groupChatRepository.getGroupChatById(chatId);
    if (!chatData) throw new Error("Group chat not found");

    const members = await groupChatRepository.getGroupChatMembers(chatId);
    const messageIds = await groupChatRepository.getGroupChatMessageIds(chatId);

    return new GroupChat(chatId, members, messageIds, chatData.groupname, chatData.admin);
  }

  async addUserToGroupChat(
    chatId: number,
    targetUserId: number,
    currentUserId: number
  ): Promise<boolean> {
    const admin = await groupChatRepository.getGroupChatAdmin(chatId);

    if (admin !== currentUserId) {
      throw new Error("Only the group admin can add members");
    }

    const members = await groupChatRepository.getGroupChatMembers(chatId);

    if (members.includes(targetUserId)) {
      throw new Error("User is already a member of this chat");
    }

    await groupChatRepository.addMemberToGroupChat(chatId, targetUserId);
    return true;
  }

  // Removing users is done in two steps:
  // Initial check, allowing only admin- and selfremove
  // Followed by implementing decoupling logic from regular chat (pseudonymisation, or deleting database entries when no users remain)
  async removeUserFromGroupChat(
    chatId: number,
    targetUserId: number,
    currentUserId: number
  ): Promise<{ userDecoupled: boolean; chatDeleted: boolean }> {
    const admin = await groupChatRepository.getGroupChatAdmin(chatId);

    // Only admin or the user themself can remove
    if (admin !== currentUserId && targetUserId !== currentUserId) {
      throw new Error("Only the group admin can remove members");
    }

    const members = await groupChatRepository.getGroupChatMembers(chatId);

    if (!members.includes(targetUserId)) {
      throw new Error("User is not a member of this chat");
    }

    // removal of user leads to executing the decouple logic from regular chat
    // this ensures pseudonymization, or cleanup if needed
    return chatService.decoupleUserFromChat(chatId, targetUserId, 1);
  }

  async decoupleUserFromGroupChat(
    chatId: number,
    userId: number,
    fakeUserId = 1
  ): Promise<{ userDecoupled: boolean; chatDeleted: boolean }> {
    return chatService.decoupleUserFromChat(chatId, userId, fakeUserId);
  }
}

export const groupChatService = new GroupChatService();