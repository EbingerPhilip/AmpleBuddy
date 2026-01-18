import {contactsReposetory} from "../repository/contactsReposetory";
import {contactRequestsReposetory} from "../repository/contactRequestsReposetory";

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

    async areContacts(userA: number, userB: number): Promise<boolean> {
        return contactRequestsReposetory.areContacts(userA, userB);
    }

}

export const contactsService = new ContactsService();