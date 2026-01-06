import { contactsReposetory } from "../repository/contactsReposetory";

class ContactsService {

    async createContact(
        userid1: number,
        userid2: number
    ): Promise<void> {
        await contactsReposetory.createContacts({userid1, userid2});
    }

    async getContacts(userId: number): Promise<any | null> {
        return contactsReposetory.getContactsByUserId(userId);
    }

    async deleteContacts(userId1: number, userId2: number): Promise<any | null> {
        return contactsReposetory.deleteContact(userId1, userId2);
    }
}

export const contactsService = new ContactsService();