const pool = require("../config/db");

class ContactRequestsReposetory {
    async createContactRequest(cont: {
        useridOwner: number;
        useridRequester: number;
    }): Promise<void> {
        const sql = `INSERT INTO contactrequests (useridOwner, useridRequester)
      VALUES (?, ?);`;
        await pool.execute(sql, [
            cont.useridOwner,
            cont.useridRequester
        ]);
    }

    async getContactRequestsByUserId(userid: number): Promise<any|null>{
        const sql = `select * from contacts where useridOwner = ?;`;
        const [rows]: any = await pool.execute(sql, [userid]);
        return rows ?? null;
    }

    async getSentContactsByUserId( userId: number): Promise<any|null>{
        const sql = `select * from contacts where useridRequester = ?;`;
        const [rows]: any = await pool.execute(sql, [userId]);
        return rows ?? null;
    }

    async deleteContactRequests(useridOwner: number, useridRequester: number): Promise<any|null>{
        const sql = `DELETE FROM contactrequests WHERE useridOwner = ? and useridRequester = ?;`;
        const [rows]: any = await pool.execute(sql, [useridOwner, useridRequester]);
        return rows[0] ?? null;
    }
}

export const contactRequestsReposetory = new ContactRequestsReposetory();