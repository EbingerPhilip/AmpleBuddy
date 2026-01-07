const pool = require("../config/db");

class ContactRequestsReposetory {
    async createContactRequest(cont: {
        useridOwner: number;
        useridRequester: number;
    }): Promise<void> {
        const sql = `INSERT INTO contactrequests (useridReciever, useridRequester)
                     VALUES (?, ?);`;
        await pool.execute(sql, [
            cont.useridOwner,
            cont.useridRequester
        ]);
    }

    async getContactRequestsByUserId(userid: number): Promise<any|null>{
        const sql = `SELECT * FROM contactrequests WHERE useridReciever = ?;`;
        const [rows]: any = await pool.execute(sql, [userid]);
        return rows ?? null;
    }

    async getSentContactsByUserId( userId: number): Promise<any|null>{
        const sql = `select * from contacts where useridRequester = ?;`;
        const [rows]: any = await pool.execute(sql, [userId]);
        return rows ?? null;
    }

    async deleteContactRequests(useridOwner: number, useridRequester: number): Promise<any|null>{
        const sql = `DELETE FROM contactrequests
                     WHERE useridReciever = ? AND useridRequester = ?;`;
        const [rows]: any = await pool.execute(sql, [useridOwner, useridRequester]);
        return rows[0] ?? null;
    }

    async areContacts(userid1: number, userid2: number): Promise<boolean> {
        const sql = `
            SELECT 1
            FROM contacts
            WHERE (userid1 = ? AND userid2 = ?)
               OR (userid1 = ? AND userid2 = ?)
                LIMIT 1;
        `;
        const [rows]: any = await pool.execute(sql, [userid1, userid2, userid2, userid1]);
        return rows.length > 0;
    }


}

export const contactRequestsReposetory = new ContactRequestsReposetory();