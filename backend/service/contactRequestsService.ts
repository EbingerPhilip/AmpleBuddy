import {contactRequestsReposetory} from "../repository/contactRequestsReposetory";

class ContactRequestsService {

    async createContactRequest(
        useridOwner: number,
        useridRequester: number
    ): Promise<void> {
        await contactRequestsReposetory.createContactRequest({useridOwner, useridRequester});
    }

    async getContactRequests(userId: number): Promise<any | null> {
        return contactRequestsReposetory.getContactRequestsByUserId(userId);
    }

    async deleteContactRequest(useridOwner: number, useridRequester: number): Promise<any | null> {
        return contactRequestsReposetory.deleteContactRequests(useridOwner, useridRequester);
    }
}

export const contactRequestsService = new ContactRequestsService();