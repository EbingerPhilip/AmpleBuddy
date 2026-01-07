const pool = require("../config/db");

class PreviewRepository {
  /*
  Load chat previews for user dashboard 
  SQL query loads latest message (highest messageId) per chat for given userId
  Also loads the userId and nickname of the other user in 1-to-1 chats
  [{
      "chatId": 5,
      "sender": 2,
      "text": "...",
      "otherUserId": 3,
      "otherUserNickname": "Nick"
  }]
  */
  async loadChatPreviewsForUserMinimal(userId: number): Promise<any[]> {
    const sql = `
      SELECT 
        c.chatId,
        0 AS \`group\`,
        m.sender,
        (SELECT nicknames FROM users WHERE userid = m.sender) AS sendernickname,
        m.text,
        (SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?) AS otherUserId,
        (SELECT nicknames FROM users WHERE userid = (
          SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?
        )) AS otherUserNickname,
        m.messageId
      FROM chatdata c
      INNER JOIN chatmembers cm ON c.chatId = cm.chatid
      LEFT JOIN messages m ON c.chatId = m.chatid 
        AND m.messageId = (
          SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
        )
      WHERE cm.userid = ? AND c.\`group\` = 0
      ORDER BY m.messageId DESC
    `;
    const [rows]: any = await pool.execute(sql, [userId, userId, userId]);
    return rows;
  }

  /*
  Load group chat previews for user dashboard
  SQL query loads latest message (highest messageId) per group chat for given userId
  Also loads the groupname and sender's nickname
  [{
      "chatId": 8,
      "sender": 1,
      "sendernickname": "Nick",
      "text": "See you later!",
      "groupname": "Suck it - vampire style!"
  }]
  */
  async loadGroupChatPreviewsForUserMinmal(userId: number): Promise<any[]> {
    const sql = `
      SELECT 
        c.chatId,
        1 AS \`group\`,
        m.sender,
        (SELECT nicknames FROM users WHERE userid = m.sender) AS sendernickname,
        m.text,
        c.groupname,
        m.messageId
      FROM chatdata c
      INNER JOIN chatmembers cm ON c.chatId = cm.chatid
      LEFT JOIN messages m ON c.chatId = m.chatid 
        AND m.messageId = (
          SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
        )
      WHERE cm.userid = ? AND c.\`group\` = 1
      ORDER BY m.messageId DESC
    `;
    const [rows]: any = await pool.execute(sql, [userId]);
    return rows;
  }

  /*
  Load both chat types combined and sorted by latest message
  SQL query returns 1-to-1 and group chats merged, ordered by highest messageId (newest first)
  Both chat types are strictly interleaved with consistent field order
  [{
    "chatId": 8,
    "group": 1,
    "sender": 1,
    "text": "See you later!",
    "otherUserId": null,
    "otherUserNickname": null,
    "sendernickname": "Nick",
    "groupname": "Suck it - vampire style!",
    "messageId": 11
  },
  {
    "chatId": 5,
    "group": 0,
    "sender": 2,
    "text": "...",
    "otherUserId": 3,
    "otherUserNickname": "Nick",
    "sendernickname": null,
    "groupname": null,
    "messageId": 7
  }]
  */
  async loadAllChatPreviewsForUser(userId: number): Promise<any[]> {
    const sql = `
      SELECT * FROM (
        (
          SELECT 
            c.chatId,
            0 AS \`group\`,
            m.sender,
            m.text,
            (SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?) AS otherUserId,
            (SELECT nicknames FROM users WHERE userid = (
              SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?
            )) AS otherUserNickname,
            (SELECT nicknames FROM users WHERE userid = m.sender) AS sendernickname,
            NULL AS groupname,
            m.messageId
          FROM chatdata c
          INNER JOIN chatmembers cm ON c.chatId = cm.chatid
          LEFT JOIN messages m ON c.chatId = m.chatid 
            AND m.messageId = (
              SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
            )
          WHERE cm.userid = ? AND c.\`group\` = 0
        )
        UNION ALL
        (
          SELECT 
            c.chatId,
            1 AS \`group\`,
            m.sender,
            m.text,
            NULL AS otherUserId,
            NULL AS otherUserNickname,
            (SELECT nicknames FROM users WHERE userid = m.sender) AS sendernickname,
            c.groupname,
            m.messageId
          FROM chatdata c
          INNER JOIN chatmembers cm ON c.chatId = cm.chatid
          LEFT JOIN messages m ON c.chatId = m.chatid 
            AND m.messageId = (
              SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
            )
          WHERE cm.userid = ? AND c.\`group\` = 1
        )
      ) AS combined
      ORDER BY messageId DESC
    `;
    const [rows]: any = await pool.execute(sql, [userId, userId, userId, userId]);
    return rows;
  }

  /*
  Load only 1-to-1 chat previews (no group chats)
  SQL query loads latest message (highest messageId) per 1-to-1 chat for given userId
  Also loads the userId and nickname of the other user
  [{
    "chatId": 5,
    "group": 0,
    "sender": 2,
    "text": "Hey, wie geht's?",
    "otherUserId": 3,
    "otherUserNickname": "Luna",
    "sendernickname": null,
    "groupname": null,
    "messageId": 7
  }]
  */
  async loadChatOnlyPreviewsForUser(userId: number): Promise<any[]> {
    const sql = `
      SELECT 
        c.chatId,
        0 AS \`group\`,
        m.sender,
        m.text,
        (SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?) AS otherUserId,
        (SELECT nicknames FROM users WHERE userid = (
          SELECT userid FROM chatmembers WHERE chatid = c.chatId AND userid != ?
        )) AS otherUserNickname,
        NULL AS sendernickname,
        NULL AS groupname,
        m.messageId
      FROM chatdata c
      INNER JOIN chatmembers cm ON c.chatId = cm.chatid
      LEFT JOIN messages m ON c.chatId = m.chatid 
        AND m.messageId = (
          SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
        )
      WHERE cm.userid = ? AND c.\`group\` = 0
      ORDER BY m.messageId DESC
    `;
    const [rows]: any = await pool.execute(sql, [userId, userId, userId]);
    return rows;
  }

  /*
  Load only group chat previews (no 1-to-1 chats)
  SQL query loads latest message (highest messageId) per group chat for given userId
  Also loads the groupname and sender's nickname
  [{
    "chatId": 8,
    "group": 1,
    "sender": 1,
    "text": "See you later!",
    "otherUserId": null,
    "otherUserNickname": null,
    "sendernickname": "Nick",
    "groupname": "Suck it - vampire style!",
    "messageId": 11
  }]
  */
  async loadGroupChatOnlyPreviewsForUser(userId: number): Promise<any[]> {
    const sql = `
      SELECT 
        c.chatId,
        1 AS \`group\`,
        m.sender,
        m.text,
        NULL AS otherUserId,
        NULL AS otherUserNickname,
        (SELECT nicknames FROM users WHERE userid = m.sender) AS sendernickname,
        c.groupname,
        m.messageId
      FROM chatdata c
      INNER JOIN chatmembers cm ON c.chatId = cm.chatid
      LEFT JOIN messages m ON c.chatId = m.chatid 
        AND m.messageId = (
          SELECT MAX(messageId) FROM messages WHERE chatid = c.chatId
        )
      WHERE cm.userid = ? AND c.\`group\` = 1
      ORDER BY m.messageId DESC
    `;
    const [rows]: any = await pool.execute(sql, [userId]);
    return rows;
  }
}

export const previewRepository = new PreviewRepository();
