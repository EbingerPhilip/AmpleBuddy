export enum EDailyMood {
  green = 'green',
  yellow = 'yellow',
  red = 'red',
  grey = 'grey'
}

export enum ETheme {
  light = 'light',
  dark = 'dark',
  colourblind = 'colourblind'
  // fucking vampire
}

export enum EPronouns {
  heHim = 'he/him',
  sheHer = 'she/her',
  theyThem = 'they/them',
  hidden = 'hidden'
}

export class User {
  userid: number;
  username: string;
  password: string;
  nicknames: string;
  dailyMood: EDailyMood;
  dateOfBirth: Date | null;
  theme: ETheme;
  pronouns: EPronouns;
  instantBuddy: boolean;

  constructor(
    userid: number,
    username: string,
    password: string,
    nicknames: string,
    dailyMood: EDailyMood = EDailyMood.grey,
    dateOfBirth: Date | null = null,
    theme: ETheme = ETheme.light,
    pronouns: EPronouns = EPronouns.hidden,
    instantBuddy: boolean = false
  ) {
    this.userid = userid;
    this.username = username;
    this.password = password;
    this.nicknames = nicknames;
    this.dailyMood = dailyMood;
    this.dateOfBirth = dateOfBirth;
    this.theme = theme;
    this.pronouns = pronouns;
    this.instantBuddy = instantBuddy;
  }

  // private helper method to calculate age from date of birth (provided from user object)
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}