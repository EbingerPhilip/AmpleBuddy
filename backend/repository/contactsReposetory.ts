const pool = require("../config/db");

class contactsRepository {
    async createContacts(cont: {
        userid1: number;
        userid2: number;
    }): Promise<void> {
        const sql = `
      INSERT INTO contacts (userid1, userid2)
      VALUES (?, ?);
    `;
        await pool.execute(sql, [
            cont.userid1,
            cont.userid2
        ]);
    }

    async getContactsByUserId(userid: number): Promise<any|null>{
        const sql = `select * from contacts where userid1 = ? or userid2 = ?;`;
        const [rows]: any = await pool.execute(sql, [userid], [userid]);
        return rows ?? null;
    }

    async deleteContact(userid1: number, userid2: number): Promise<any|null>{
        const sql = `DELETE FROM contacts WHERE userid1 = ? and userid2 = ? or userid1 = ? and userid2 = ?;`;
        const [rows]: any = await pool.execute(sql, [userid1], [userid2], [userid1], [userid2]);
        return rows[0] ?? null;
    }
}

export const contactsReposetory = new contactsRepository();