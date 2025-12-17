const TestUser2 = {
  username: "max.musterman@gmail.com",
  nickname: "max",
  userid: 9999,
  Contacts: [
    { nickname: "philip", userid: 1, username: "blablabla" },
    { nickname: "now serving local modules", userid: 2, username: "blablabla" },
    { nickname: "martin", userid: 3, username: "blablabla" },
  ],
  getContactCount() {
    return this.Contacts.length;
  },
};

export = TestUser2;